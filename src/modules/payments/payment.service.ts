import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { retryWithBackoff } from '../../common/utils/retry.util';

const DEPOSIT_AMOUNT_CENTS = 2091;
const CANCELLATION_WINDOW_HOURS = parseInt(process.env.CANCELLATION_WINDOW_HOURS ?? '24', 10);

type StripeInstance = InstanceType<typeof Stripe>;

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

@Injectable()
export class PaymentService {
  private stripeClient: StripeInstance | null = null;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly waitlistService: WaitlistService,
  ) {
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  }

  // Lazy so the app can boot without STRIPE_SECRET_KEY when payments are disabled
  private get stripe(): StripeInstance {
    if (!this.stripeClient) {
      const apiKey = process.env.STRIPE_SECRET_KEY;
      if (!apiKey) throw new BadRequestException('Payments are not configured');
      this.stripeClient = new Stripe(apiKey, {
        apiVersion: '2026-04-22.dahlia',
      });
    }
    return this.stripeClient;
  }

  async createIntent(appointmentId: string): Promise<{ clientSecret: string }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { payment: true },
    });

    if (!appointment) throw new NotFoundException('Invalid request');
    if (appointment.status !== 'PENDING_PAYMENT') throw new BadRequestException('Invalid request');
    if (appointment.payment?.status === 'SUCCESS') throw new BadRequestException('Invalid request');

    // Cancel any stale pending intent before creating a new one
    if (appointment.payment?.stripePaymentIntentId && appointment.payment.status === 'PENDING') {
      try {
        await this.stripe.paymentIntents.cancel(appointment.payment.stripePaymentIntentId);
      } catch {
        // May already be cancelled or completed — safe to proceed
      }
      await this.prisma.payment.update({
        where: { id: appointment.payment.id },
        data: { status: 'FAILED' },
      });
    }

    const intent = await retryWithBackoff(() =>
      this.stripe.paymentIntents.create({
        amount: DEPOSIT_AMOUNT_CENTS,
        currency: 'usd',
        metadata: { appointmentId, clientId: appointment.clientId },
      }),
    );

    await this.prisma.payment.create({
      data: {
        clientId: appointment.clientId,
        appointmentId,
        amount: DEPOSIT_AMOUNT_CENTS,
        status: 'PENDING',
        stripePaymentIntentId: intent.id,
      },
    });

    await this.auditService.log('PAYMENT_INTENT_CREATED', { appointmentId, intentId: intent.id });

    return { clientSecret: intent.client_secret! };
  }

  async createCheckoutSession(appointmentId: string): Promise<{ checkoutUrl: string }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { payment: true },
    });

    if (!appointment) throw new NotFoundException('Invalid request');
    if (appointment.status !== 'PENDING_PAYMENT') throw new BadRequestException('Invalid request');
    if (appointment.payment?.status === 'SUCCESS') throw new BadRequestException('Invalid request');

    // MVP mock: skip Stripe when MOCK_PAYMENTS=true
    if (process.env.MOCK_PAYMENTS === 'true') {
      await this.prisma.payment.upsert({
        where: { appointmentId },
        create: {
          clientId: appointment.clientId,
          appointmentId,
          amount: DEPOSIT_AMOUNT_CENTS,
          status: 'PENDING',
          stripePaymentIntentId: `mock_${appointmentId}`,
        },
        update: { status: 'PENDING', stripePaymentIntentId: `mock_${appointmentId}` },
      });
      const base = process.env.STRIPE_SUCCESS_URL?.replace('/success', '') ?? 'http://localhost:3000/api/payments';
      return { checkoutUrl: `${base}/mock-pay/${appointmentId}` };
    }

    if (appointment.payment?.stripePaymentIntentId && appointment.payment.status === 'PENDING') {
      try {
        await this.stripe.paymentIntents.cancel(appointment.payment.stripePaymentIntentId);
      } catch {
        // Already cancelled or completed
      }
      await this.prisma.payment.update({
        where: { id: appointment.payment.id },
        data: { status: 'FAILED' },
      });
    }

    const baseSuccessUrl = process.env.STRIPE_SUCCESS_URL ?? 'https://munaybliss.com/payment/success';
    const successUrl = `${baseSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`;

    const session = await retryWithBackoff(() =>
      this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'Appointment Deposit' },
            unit_amount: DEPOSIT_AMOUNT_CENTS,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: process.env.STRIPE_CANCEL_URL ?? 'https://munaybliss.com/payment/cancel',
        metadata: { appointmentId, clientId: appointment.clientId },
      }),
    );

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as { id?: string } | null)?.id ?? null;

    await this.prisma.payment.create({
      data: {
        clientId: appointment.clientId,
        appointmentId,
        amount: DEPOSIT_AMOUNT_CENTS,
        status: 'PENDING',
        stripePaymentIntentId: paymentIntentId,
      },
    });

    await this.auditService.log('PAYMENT_CHECKOUT_CREATED', { appointmentId, sessionId: session.id });

    return { checkoutUrl: session.url! };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: StripeEvent;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      ) as unknown as StripeEvent;
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    const obj = event.data.object;

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.onPaymentSucceeded(obj);
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentFailed(obj);
        break;
      case 'payment_intent.canceled':
        await this.onPaymentCanceled(obj);
        break;
      case 'charge.refunded':
        await this.onRefundSucceeded(obj);
        break;
    }
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Invalid request');
    return payment;
  }

  async handleCancellation(appointmentId: string, appointmentStartTime: Date): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { appointmentId } });
    if (!payment) return;

    if (payment.status === 'PENDING') {
      if (payment.stripePaymentIntentId) {
        try {
          await this.stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
        } catch {
          // Already cancelled or completed
        }
      }
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      await this.auditService.log('PAYMENT_CANCELLED_NO_CHARGE', { paymentId: payment.id });
      return;
    }

    if (payment.status !== 'SUCCESS') return;

    const hoursUntil = (appointmentStartTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntil >= CANCELLATION_WINDOW_HOURS) {
      await retryWithBackoff(() =>
        this.stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId! }),
      );
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      await this.auditService.log('PAYMENT_REFUNDED_CANCELLATION', { paymentId: payment.id });
    } else {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PENALTY_APPLIED' },
      });
      await this.auditService.log('PAYMENT_PENALTY_LATE_CANCELLATION', { paymentId: payment.id });
    }
  }

  async applyNoShowPenalty(appointmentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { appointmentId } });
    if (!payment || payment.status !== 'SUCCESS') return;
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'PENALTY_APPLIED' } });
    await this.auditService.log('PAYMENT_PENALTY_NO_SHOW', { paymentId: payment.id, appointmentId });
  }

  async mockPay(appointmentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { appointmentId } });
    if (!payment || payment.status === 'SUCCESS') return;

    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS' } });
    await this.prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'CONFIRMED' } });
    await this.auditService.log('PAYMENT_MOCK_CONFIRMED', { appointmentId });
  }

  async confirmFromSession(sessionId: string): Promise<{ confirmed: boolean; appointmentId?: string }> {
    let session: Awaited<ReturnType<StripeInstance['checkout']['sessions']['retrieve']>>;
    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return { confirmed: false };
    }

    if (session.payment_status !== 'paid') return { confirmed: false };

    const appointmentId = session.metadata?.appointmentId;
    if (!appointmentId) return { confirmed: false };

    const payment = await this.prisma.payment.findUnique({ where: { appointmentId } });
    if (!payment) return { confirmed: false };

    if (payment.status === 'SUCCESS') return { confirmed: true, appointmentId };

    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS' } });
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMED' },
    });
    await this.auditService.log('PAYMENT_SUCCESS_VIA_REDIRECT', { paymentId: payment.id, appointmentId, sessionId });

    return { confirmed: true, appointmentId };
  }

  async hasSuccessfulPayment(appointmentId: string): Promise<boolean> {
    const payment = await this.prisma.payment.findUnique({ where: { appointmentId } });
    return payment?.status === 'SUCCESS';
  }

  private async onPaymentSucceeded(obj: Record<string, unknown>): Promise<void> {
    const intentId = obj['id'] as string;
    const amountReceived = obj['amount_received'] as number;

    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: intentId },
    });
    if (!payment) return;

    // Partial payment: reject and refund
    if (amountReceived !== DEPOSIT_AMOUNT_CENTS) {
      await retryWithBackoff(() => this.stripe.refunds.create({ payment_intent: intentId }));
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      await this.prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: 'CANCELLED' },
      });
      await this.auditService.log('PAYMENT_PARTIAL_REJECTED', { paymentId: payment.id, amountReceived });
      const appt = await this.prisma.appointment.findUnique({ where: { id: payment.appointmentId } });
      if (appt) await this.waitlistService.promoteForSlot(appt.startTime);
      return;
    }

    // Duplicate: already confirmed
    if (payment.status === 'SUCCESS') {
      await retryWithBackoff(() => this.stripe.refunds.create({ payment_intent: intentId }));
      await this.auditService.log('PAYMENT_DUPLICATE_REFUNDED', { paymentId: payment.id });
      return;
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: payment.appointmentId },
    });

    // Slot cancelled before payment arrived: refund
    if (!appointment || appointment.status === 'CANCELLED') {
      await retryWithBackoff(() => this.stripe.refunds.create({ payment_intent: intentId }));
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      await this.auditService.log('PAYMENT_REFUNDED_SLOT_EXPIRED', { paymentId: payment.id });
      return;
    }

    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS' } });
    await this.prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: { status: 'CONFIRMED' },
    });
    await this.auditService.log('PAYMENT_SUCCESS_APPOINTMENT_CONFIRMED', {
      paymentId: payment.id,
      appointmentId: payment.appointmentId,
    });
  }

  private async onPaymentFailed(obj: Record<string, unknown>): Promise<void> {
    const intentId = obj['id'] as string;
    const payment = await this.prisma.payment.findUnique({ where: { stripePaymentIntentId: intentId } });
    if (!payment || payment.status !== 'PENDING') return;

    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    await this.prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: { status: 'CANCELLED' },
    });
    await this.auditService.log('PAYMENT_FAILED', { paymentId: payment.id });

    const appt = await this.prisma.appointment.findUnique({ where: { id: payment.appointmentId } });
    if (appt) await this.waitlistService.promoteForSlot(appt.startTime);
  }

  private async onPaymentCanceled(obj: Record<string, unknown>): Promise<void> {
    const intentId = obj['id'] as string;
    const payment = await this.prisma.payment.findUnique({ where: { stripePaymentIntentId: intentId } });
    if (!payment || payment.status !== 'PENDING') return;

    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    await this.prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: { status: 'CANCELLED' },
    });
    await this.auditService.log('PAYMENT_INTENT_EXPIRED', { paymentId: payment.id });

    const appt = await this.prisma.appointment.findUnique({ where: { id: payment.appointmentId } });
    if (appt) await this.waitlistService.promoteForSlot(appt.startTime);
  }

  private async onRefundSucceeded(obj: Record<string, unknown>): Promise<void> {
    const paymentIntentId = obj['payment_intent'] as string | undefined;
    if (!paymentIntentId) return;

    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!payment) return;

    if (payment.status !== 'REFUNDED') {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
    }
    await this.auditService.log('REFUND_CONFIRMED', { paymentId: payment.id });
  }
}
