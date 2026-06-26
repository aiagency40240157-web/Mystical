import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PrivacyRuleService } from '../privacy/privacy-rule.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { PaymentService } from '../payments/payment.service';
import { AuditService } from '../audit/audit.service';
import { ClientsService } from '../clients/clients.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import {
  pacificMinutesSinceMidnight,
  pacificDateString,
  pacificDayBounds,
  pacificWallClockToUtc,
  addDaysToDateString,
} from '../../common/utils/timezone.util';

// Business hours are Pacific Time (office in Orange County, CA).
const DURATION_MS = 30 * 60_000;
const DAY_START_MIN = 9 * 60;      // 09:00 PT
const DAY_END_MIN = 19 * 60;       // 19:00 PT
const BREAK_START_MIN = 13 * 60 + 30; // 13:30 PT
const BREAK_END_MIN = 14 * 60 + 15;   // 14:15 PT

type BookingResponse = {
  status:
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'REJECTED'
    | 'ALTERNATIVES'
    | 'WAITLIST'
    | 'RESCHEDULED'
    | 'CANCELLED';
  message: string;
  options: string[];
  appointmentId?: string;
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly privacyRuleService: PrivacyRuleService,
    @Optional() private readonly waitlistService: WaitlistService,
    @Optional() private readonly paymentService: PaymentService,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly clientsService: ClientsService,
  ) {}

  async bookViaBot(
    phone: string,
    firstName: string,
    lastName: string,
    startTime: string,
    serviceName?: string,
  ): Promise<BookingResponse & { clientId?: string }> {
    const client = await this.clientsService.findOrCreateByPhone(phone, firstName, lastName);
    const serviceId = serviceName ? await this.resolveServiceId(serviceName) : undefined;
    const result = await this.create({ clientId: client.id, startTime, serviceId });
    return { ...result, clientId: client.id };
  }

  // Best-effort match of the bot's free-text service name against the catalog.
  // A booking is never rejected for an unrecognized name — it just stays without service.
  private async resolveServiceId(serviceName: string): Promise<string | undefined> {
    const name = serviceName.trim();
    if (!name) return undefined;

    const exact = await this.prisma.service.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, isActive: true },
    });
    if (exact) return exact.id;

    const partial = await this.prisma.service.findFirst({
      where: { name: { contains: name, mode: 'insensitive' }, isActive: true },
    });
    return partial?.id;
  }

  async create(dto: CreateAppointmentDto): Promise<BookingResponse> {
    const start = new Date(dto.startTime);
    if (isNaN(start.getTime())) {
      return { status: 'REJECTED', message: 'Invalid request', options: [] };
    }

    const end = new Date(start.getTime() + DURATION_MS);

    if (!this.isWithinWorkingHours(start, end)) {
      return { status: 'REJECTED', message: 'Time slot not available', options: [] };
    }

    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) {
      return { status: 'REJECTED', message: 'Invalid request', options: [] };
    }

    // Validate the optional service reference; an unknown id is dropped, not fatal.
    let serviceId: string | undefined;
    if (dto.serviceId) {
      const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
      if (service) serviceId = service.id;
    }

    const privacyEnabled = process.env.ENABLE_PRIVACY_ENGINE !== 'false';
    const allowed = privacyEnabled
      ? await this.privacyRuleService.evaluate({ clientId: dto.clientId, startTime: start, endTime: end })
      : true;

    if (!allowed) {
      return this.buildAlternativesOrWaitlist(dto.clientId, start);
    }

    const paymentsEnabled = process.env.ENABLE_PAYMENTS !== 'false';

    let appointmentId = '';
    try {
      await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const conflict = await tx.appointment.findFirst({
            where: {
              status: { not: 'CANCELLED' },
              startTime: { lt: end },
              endTime: { gt: start },
            },
          });

          if (conflict) throw new Error('SLOT_TAKEN');

          const appt = await tx.appointment.create({
            data: {
              clientId: dto.clientId,
              serviceId,
              startTime: start,
              endTime: end,
              // Without payments (MVP) there is no deposit step to wait for
              status: paymentsEnabled ? 'PENDING_PAYMENT' : 'CONFIRMED',
            },
          });
          appointmentId = appt.id;
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (e: any) {
      if (e.message !== 'SLOT_TAKEN' && e.code !== 'P2034') throw e;
    }

    if (appointmentId) {
      if (process.env.ENABLE_AUDIT !== 'false') {
        this.auditService.log('APPOINTMENT_CREATED', { clientId: dto.clientId, startTime: start.toISOString() });
      }
      return paymentsEnabled
        ? { status: 'PENDING_PAYMENT', message: 'Payment required to confirm appointment', options: [], appointmentId }
        : { status: 'CONFIRMED', message: 'Appointment confirmed', options: [], appointmentId };
    }

    return this.buildAlternativesOrWaitlist(dto.clientId, start);
  }

  async reschedule(dto: RescheduleAppointmentDto): Promise<BookingResponse> {
    const newStart = new Date(dto.newStartTime);
    if (isNaN(newStart.getTime())) {
      return { status: 'REJECTED', message: 'Invalid request', options: [] };
    }

    const newEnd = new Date(newStart.getTime() + DURATION_MS);

    const existing = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });

    if (!existing || existing.status === 'CANCELLED' || existing.status === 'NO_SHOW') {
      return { status: 'REJECTED', message: 'Invalid request', options: [] };
    }

    if (!this.isWithinWorkingHours(newStart, newEnd)) {
      return { status: 'REJECTED', message: 'Time slot not available', options: [] };
    }

    const privacyEnabled = process.env.ENABLE_PRIVACY_ENGINE !== 'false';
    const allowed = privacyEnabled
      ? await this.privacyRuleService.evaluate({ clientId: existing.clientId, startTime: newStart, endTime: newEnd })
      : true;

    if (!allowed) {
      return this.buildAlternativesOrWaitlist(existing.clientId, newStart);
    }

    const paymentsEnabled = process.env.ENABLE_PAYMENTS !== 'false';
    const paidAlready =
      existing.status === 'CONFIRMED' ||
      (paymentsEnabled && (await this.paymentService.hasSuccessfulPayment(existing.id)));
    const newStatus = paidAlready || !paymentsEnabled ? 'CONFIRMED' : 'PENDING_PAYMENT';

    let rescheduled = false;
    try {
      await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const conflict = await tx.appointment.findFirst({
            where: {
              status: { not: 'CANCELLED' },
              id: { not: existing.id },
              startTime: { lt: newEnd },
              endTime: { gt: newStart },
            },
          });

          if (conflict) throw new Error('SLOT_TAKEN');

          await tx.appointment.update({
            where: { id: existing.id },
            data: { status: 'CANCELLED' },
          });
          await tx.appointment.create({
            data: {
              clientId: existing.clientId,
              serviceId: existing.serviceId,
              startTime: newStart,
              endTime: newEnd,
              status: newStatus,
            },
          });
          rescheduled = true;
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (e: any) {
      if (e.message !== 'SLOT_TAKEN' && e.code !== 'P2034') throw e;
    }

    if (rescheduled) {
      if (process.env.ENABLE_AUDIT !== 'false') {
        this.auditService.log('APPOINTMENT_RESCHEDULED', { oldAppointmentId: existing.id, clientId: existing.clientId, newStartTime: newStart.toISOString() });
      }
      if (process.env.ENABLE_PAYMENTS !== 'false') {
        await this.paymentService.handleCancellation(existing.id, existing.startTime);
      }
      if (process.env.ENABLE_WAITLIST !== 'false') {
        await this.waitlistService.promoteForSlot(existing.startTime);
      }
      return { status: 'RESCHEDULED', message: 'Appointment rescheduled', options: [] };
    }

    return this.buildAlternativesOrWaitlist(existing.clientId, newStart);
  }

  async cancel(id: string): Promise<BookingResponse> {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment || appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') {
      return { status: 'REJECTED', message: 'Invalid request', options: [] };
    }

    if (process.env.ENABLE_PAYMENTS !== 'false') {
      await this.paymentService.handleCancellation(appointment.id, appointment.startTime);
    }

    await this.prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } });

    if (process.env.ENABLE_AUDIT !== 'false') {
      this.auditService.log('APPOINTMENT_CANCELLED', { appointmentId: id, clientId: appointment.clientId });
    }

    if (process.env.ENABLE_WAITLIST !== 'false') {
      await this.waitlistService.promoteForSlot(appointment.startTime);
    }

    return { status: 'CANCELLED', message: 'Appointment cancelled', options: [] };
  }

  async markNoShow(id: string): Promise<BookingResponse> {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment || appointment.status !== 'CONFIRMED') {
      return { status: 'REJECTED', message: 'Invalid request', options: [] };
    }

    if (process.env.ENABLE_PAYMENTS !== 'false') {
      await this.paymentService.applyNoShowPenalty(appointment.id);
    }

    await this.prisma.appointment.update({ where: { id }, data: { status: 'NO_SHOW' } });

    if (process.env.ENABLE_AUDIT !== 'false') {
      this.auditService.log('APPOINTMENT_NO_SHOW', { appointmentId: id, clientId: appointment.clientId });
    }

    return { status: 'CANCELLED', message: 'No-show recorded', options: [] };
  }

  async getPendingReminders(window: '24h' | '5h') {
    const ms = window === '24h' ? 24 * 60 * 60 * 1000 : 5 * 60 * 60 * 1000;
    const target = new Date(Date.now() + ms);
    const tolerance = 5 * 60 * 1000;
    const where =
      window === '24h'
        ? {
            status: 'CONFIRMED',
            reminderSent24h: false,
            startTime: { gte: new Date(target.getTime() - tolerance), lte: new Date(target.getTime() + tolerance) },
          }
        : {
            status: 'CONFIRMED',
            reminderSent5h: false,
            startTime: { gte: new Date(target.getTime() - tolerance), lte: new Date(target.getTime() + tolerance) },
          };
    return this.prisma.appointment.findMany({
      where,
      include: {
        client: { select: { firstName: true, lastName: true, phone: true, preferredLanguage: true } },
        service: { select: { name: true } },
      },
    });
  }

  async markReminderSent(id: string, window: '24h' | '5h'): Promise<void> {
    const data = window === '24h' ? { reminderSent24h: true } : { reminderSent5h: true };
    await this.prisma.appointment.update({ where: { id }, data });
  }

  findAll() {
    return this.prisma.appointment.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        client: { select: { firstName: true, lastName: true } },
        service: { select: { name: true, category: true, price: true, durationMins: true } },
      },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        client: { select: { firstName: true, lastName: true } },
        service: { select: { name: true, category: true, price: true, durationMins: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Invalid request');
    return appointment;
  }

  async getAvailability(date: string, clientId?: string): Promise<string[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Invalid request');
    }

    const { start: dayStart, end: dayEnd } = pacificDayBounds(date);

    const existing = await this.prisma.appointment.findMany({
      where: {
        status: { not: 'CANCELLED' },
        startTime: { gte: dayStart, lte: dayEnd },
      },
    });

    const freeSlots = this.generateSlots(date).filter((slot) => {
      const slotStart = new Date(slot);
      const slotEnd = new Date(slotStart.getTime() + DURATION_MS);

      const slotStartMin = pacificMinutesSinceMidnight(slotStart);
      const slotEndMin = pacificMinutesSinceMidnight(slotEnd);

      if (slotStartMin < BREAK_END_MIN && slotEndMin > BREAK_START_MIN) return false;

      return !existing.some((a: { startTime: Date; endTime: Date }) => slotStart < a.endTime && slotEnd > a.startTime);
    });

    if (!clientId || process.env.ENABLE_PRIVACY_ENGINE === 'false') return freeSlots;

    const filtered: string[] = [];
    for (const slot of freeSlots) {
      const slotStart = new Date(slot);
      const slotEnd = new Date(slotStart.getTime() + DURATION_MS);
      const allowed = await this.privacyRuleService.check({ clientId, startTime: slotStart, endTime: slotEnd });
      if (allowed) filtered.push(slot);
    }
    return filtered;
  }

  private isWithinWorkingHours(start: Date, end: Date): boolean {
    const startMin = pacificMinutesSinceMidnight(start);
    const endMin = pacificMinutesSinceMidnight(end);
    return startMin >= DAY_START_MIN && endMin <= DAY_END_MIN;
  }

  private async buildAlternativesOrWaitlist(
    clientId: string,
    fromDate: Date,
  ): Promise<BookingResponse> {
    const sameDayOptions = await this.getPrivacyFilteredSlots(
      clientId,
      pacificDateString(fromDate),
      fromDate,
    );

    if (sameDayOptions.length > 0) {
      return { status: 'ALTERNATIVES', message: 'Time slot not available', options: sameDayOptions.slice(0, 3) };
    }

    const nextDayStr = addDaysToDateString(pacificDateString(fromDate), 1);
    const nextDayOptions = await this.getPrivacyFilteredSlots(
      clientId,
      nextDayStr,
      null,
    );

    if (nextDayOptions.length > 0) {
      return { status: 'ALTERNATIVES', message: 'Time slot not available', options: nextDayOptions.slice(0, 3) };
    }

    if (process.env.ENABLE_WAITLIST !== 'false') {
      await this.waitlistService.add(clientId, fromDate);
      return { status: 'WAITLIST', message: 'Added to waitlist', options: [] };
    }
    return { status: 'ALTERNATIVES', message: 'Time slot not available', options: [] };
  }

  private async getPrivacyFilteredSlots(
    clientId: string,
    date: string,
    excludeSlot: Date | null,
  ): Promise<string[]> {
    const slots = await this.getAvailability(date);
    const privacyEnabled = process.env.ENABLE_PRIVACY_ENGINE !== 'false';
    const filtered: string[] = [];

    for (const slot of slots) {
      const slotStart = new Date(slot);
      if (excludeSlot && slotStart.getTime() === excludeSlot.getTime()) continue;
      if (privacyEnabled) {
        const slotEnd = new Date(slotStart.getTime() + DURATION_MS);
        const allowed = await this.privacyRuleService.check({ clientId, startTime: slotStart, endTime: slotEnd });
        if (!allowed) continue;
      }
      filtered.push(slot);
    }

    return filtered;
  }

  private generateSlots(date: string): string[] {
    // Generate 30-min slots at Pacific wall-clock business hours, stored as UTC ISO.
    const slots: string[] = [];
    for (let min = DAY_START_MIN; min + 30 <= DAY_END_MIN; min += 30) {
      slots.push(pacificWallClockToUtc(date, min).toISOString());
    }
    return slots;
  }
}
