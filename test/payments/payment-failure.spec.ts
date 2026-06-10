/**
 * Payment failure simulation tests.
 * Validates: duplicate webhooks, partial payments, failed payments,
 * refund logic, cancellation windows, and idempotent handling.
 */
import { PaymentService } from '../../src/modules/payments/payment.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { WaitlistService } from '../../src/modules/waitlist/waitlist.service';

const DEPOSIT = 2091;

function makeStripe(overrides: Record<string, unknown> = {}) {
  return {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_1', client_secret: 'secret_1' }),
      cancel: jest.fn().mockResolvedValue({}),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 'ref_1' }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    ...overrides,
  };
}

function makeService(prismaOverrides: Record<string, unknown> = {}, stripeOverrides: Record<string, unknown> = {}) {
  const prisma = {
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    ...prismaOverrides,
  };

  const audit = { log: jest.fn() } as unknown as AuditService;
  const waitlist = { promoteForSlot: jest.fn().mockResolvedValue(undefined) } as unknown as WaitlistService;

  // Stripe requires a non-empty key in the constructor; we replace it immediately after
  const savedKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_tests';
  const service = new PaymentService(prisma as never, audit, waitlist);
  process.env.STRIPE_SECRET_KEY = savedKey;

  // Replace the Stripe instance with the mock
  const stripe = makeStripe(stripeOverrides);
  Object.assign(service, { stripeClient: stripe, webhookSecret: 'whsec_test' });

  return { service, prisma, audit, waitlist, stripe };
}

describe('Payment â€” createIntent', () => {
  it('returns clientSecret for valid PENDING_PAYMENT appointment', async () => {
    const { service, prisma } = makeService();
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      clientId: 'client-1',
      status: 'PENDING_PAYMENT',
      payment: null,
    });

    const result = await service.createIntent('appt-1');
    expect(result.clientSecret).toBe('secret_1');
  });

  it('throws NotFoundException for unknown appointment', async () => {
    const { service, prisma } = makeService();
    prisma.appointment.findUnique.mockResolvedValue(null);

    await expect(service.createIntent('unknown')).rejects.toThrow();
  });

  it('throws BadRequestException when appointment is not PENDING_PAYMENT', async () => {
    const { service, prisma } = makeService();
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      status: 'CONFIRMED',
      payment: null,
    });

    await expect(service.createIntent('appt-1')).rejects.toThrow();
  });

  it('throws BadRequestException when payment already succeeded', async () => {
    const { service, prisma } = makeService();
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      status: 'PENDING_PAYMENT',
      payment: { status: 'SUCCESS', stripePaymentIntentId: 'pi_old' },
    });

    await expect(service.createIntent('appt-1')).rejects.toThrow();
  });

  it('cancels stale pending intent before creating a new one', async () => {
    const { service, prisma, stripe } = makeService();
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      clientId: 'client-1',
      status: 'PENDING_PAYMENT',
      payment: { id: 'pay-old', status: 'PENDING', stripePaymentIntentId: 'pi_old' },
    });

    await service.createIntent('appt-1');
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_old');
    expect(stripe.paymentIntents.create).toHaveBeenCalled();
  });
});

describe('Payment â€” webhook: payment_intent.succeeded', () => {
  it('confirms appointment on successful payment with correct amount', async () => {
    const { service, prisma, audit } = makeService();
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      appointmentId: 'appt-1',
      status: 'PENDING',
    });
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      status: 'PENDING_PAYMENT',
    });

    const stripe = makeStripe();
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', amount_received: DEPOSIT } },
    });
    Object.assign(service, { stripeClient: stripe, webhookSecret: 'secret' });

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'SUCCESS' } }),
    );
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CONFIRMED' } }),
    );
    expect(audit.log).toHaveBeenCalledWith('PAYMENT_SUCCESS_APPOINTMENT_CONFIRMED', expect.any(Object));
  });

  it('refunds and cancels appointment on partial payment (wrong amount)', async () => {
    const { service, prisma, stripe, waitlist } = makeService();
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay-1', appointmentId: 'appt-1', status: 'PENDING' });
    prisma.appointment.findUnique.mockResolvedValue({ id: 'appt-1', startTime: new Date() });

    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', amount_received: 500 } }, // wrong amount
    });

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' });
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'FAILED' } }),
    );
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } }),
    );
    expect(waitlist.promoteForSlot).toHaveBeenCalled();
  });

  it('refunds duplicate payment (idempotency: already SUCCESS)', async () => {
    const { service, prisma, stripe } = makeService();
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay-1', appointmentId: 'appt-1', status: 'SUCCESS' });

    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', amount_received: DEPOSIT } },
    });

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' });
    // Appointment should NOT be updated again
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it('refunds when appointment was cancelled before payment arrived', async () => {
    const { service, prisma, stripe } = makeService();
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay-1', appointmentId: 'appt-1', status: 'PENDING' });
    prisma.appointment.findUnique.mockResolvedValue({ id: 'appt-1', status: 'CANCELLED' });

    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', amount_received: DEPOSIT } },
    });

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(stripe.refunds.create).toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REFUNDED' } }),
    );
  });
});

describe('Payment â€” webhook: payment_intent.payment_failed', () => {
  it('marks payment FAILED and cancels appointment, then promotes waitlist', async () => {
    const { service, prisma, stripe, waitlist } = makeService();
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay-1', appointmentId: 'appt-1', status: 'PENDING' });
    prisma.appointment.findUnique.mockResolvedValue({ id: 'appt-1', startTime: new Date() });

    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_1' } },
    });

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'FAILED' } }),
    );
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } }),
    );
    expect(waitlist.promoteForSlot).toHaveBeenCalled();
  });

  it('is idempotent: ignores already-failed payment', async () => {
    const { service, prisma, stripe } = makeService();
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay-1', appointmentId: 'appt-1', status: 'FAILED' });

    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_1' } },
    });

    await service.handleWebhook(Buffer.from('{}'), 'sig');
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });
});

describe('Payment â€” cancellation refund/penalty rules', () => {
  it('refunds when cancelled >= CANCELLATION_WINDOW_HOURS before appointment', async () => {
    const { service, prisma, stripe } = makeService();
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      status: 'SUCCESS',
      stripePaymentIntentId: 'pi_1',
    });

    const futureStart = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h from now
    await service.handleCancellation('appt-1', futureStart);

    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' });
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REFUNDED' } }),
    );
  });

  it('applies penalty when cancelled < CANCELLATION_WINDOW_HOURS before appointment', async () => {
    const { service, prisma, stripe } = makeService();
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      status: 'SUCCESS',
      stripePaymentIntentId: 'pi_1',
    });

    const nearStart = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h from now (< 24h window)
    await service.handleCancellation('appt-1', nearStart);

    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PENALTY_APPLIED' } }),
    );
  });

  it('cancels pending Stripe intent when payment is still PENDING', async () => {
    const { service, prisma, stripe } = makeService();
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      status: 'PENDING',
      stripePaymentIntentId: 'pi_1',
    });

    await service.handleCancellation('appt-1', new Date());

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_1');
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'FAILED' } }),
    );
  });

  it('no-op when no payment exists for appointment', async () => {
    const { service, prisma, stripe } = makeService();
    prisma.payment.findUnique.mockResolvedValue(null);

    await service.handleCancellation('appt-1', new Date());
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });
});

describe('Payment â€” no-show penalty', () => {
  it('applies PENALTY_APPLIED to a confirmed payment', async () => {
    const { service, prisma, audit } = makeService();
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay-1', status: 'SUCCESS' });

    await service.applyNoShowPenalty('appt-1');

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PENALTY_APPLIED' } }),
    );
    expect(audit.log).toHaveBeenCalledWith('PAYMENT_PENALTY_NO_SHOW', expect.any(Object));
  });

  it('skips penalty when payment is not SUCCESS', async () => {
    const { service, prisma } = makeService();
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay-1', status: 'PENDING' });

    await service.applyNoShowPenalty('appt-1');
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });
});

describe('Payment â€” webhook signature validation', () => {
  it('throws BadRequestException on invalid signature', async () => {
    const { service } = makeService();
    const stripe = makeStripe();
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    Object.assign(service, { stripeClient: stripe, webhookSecret: 'secret' });

    await expect(service.handleWebhook(Buffer.from('{}'), 'bad-sig')).rejects.toThrow();
  });
});
