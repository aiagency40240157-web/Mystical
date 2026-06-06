/**
 * Concurrency tests: validates that the slot-booking system prevents double bookings
 * and handles race conditions correctly even when multiple requests arrive simultaneously.
 */
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';
import { PrivacyRuleService } from '../../src/modules/privacy/privacy-rule.service';
import { WaitlistService } from '../../src/modules/waitlist/waitlist.service';
import { PaymentService } from '../../src/modules/payments/payment.service';
import { AuditService } from '../../src/modules/audit/audit.service';

const VALID_START = '2026-06-10T17:00:00.000Z'; // 10:00 AM PDT (within working hours)

function makeClient(overrides: Record<string, unknown> = {}) {
  return { id: 'client-1', isVip: false, preferredLanguage: 'en', ...overrides };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  let appointmentCreated = false;

  const tx = {
    appointment: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(() => {
        if (appointmentCreated) throw new Error('SLOT_TAKEN');
        appointmentCreated = true;
        return Promise.resolve({ id: 'appt-1' });
      }),
    },
  };

  return {
    client: { findUnique: jest.fn().mockResolvedValue(makeClient()) },
    appointment: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'appt-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    waitlistEntry: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    ...overrides,
  };
}

function makeServices(prisma: ReturnType<typeof makePrisma>) {
  const privacy = {
    evaluate: jest.fn().mockResolvedValue(true),
    check: jest.fn().mockResolvedValue(true),
  } as unknown as PrivacyRuleService;

  const waitlist = {
    add: jest.fn().mockResolvedValue(undefined),
    promoteForSlot: jest.fn().mockResolvedValue(undefined),
  } as unknown as WaitlistService;

  const payment = {
    handleCancellation: jest.fn().mockResolvedValue(undefined),
    hasSuccessfulPayment: jest.fn().mockResolvedValue(false),
  } as unknown as PaymentService;

  const audit = { log: jest.fn() } as unknown as AuditService;

  const clients = { findOrCreateByPhone: jest.fn() } as any;
  return new AppointmentsService(
    prisma as never,
    privacy,
    waitlist,
    payment,
    audit,
    clients,
  );
}

describe('Concurrency — slot booking', () => {
  it('only one booking succeeds when multiple requests hit the same slot simultaneously', async () => {
    // Simulate: two concurrent requests for the same slot.
    // The Prisma $transaction mock allows only the first create to succeed.
    const prisma = makePrisma();
    const service = makeServices(prisma);

    const dto = { clientId: 'client-1', startTime: VALID_START };
    const [r1, r2] = await Promise.all([
      service.create(dto),
      service.create(dto),
    ]);

    const statuses = [r1.status, r2.status].sort();
    // One should be PENDING_PAYMENT, the other ALTERNATIVES or WAITLIST
    expect(statuses).toContain('PENDING_PAYMENT');
    expect(statuses.filter((s) => s === 'PENDING_PAYMENT')).toHaveLength(1);
  });

  it('returns ALTERNATIVES when slot is already taken', async () => {
    const prisma = makePrisma();
    // Mark slot as taken from the start
    const takenAppt = { startTime: new Date(VALID_START), endTime: new Date(new Date(VALID_START).getTime() + 30 * 60000), status: 'PENDING_PAYMENT' };
    prisma.appointment.findFirst = jest.fn().mockResolvedValue(takenAppt);
    prisma.appointment.findMany = jest.fn().mockResolvedValue([takenAppt]);

    const tx = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue(takenAppt),
        create: jest.fn(),
      },
    };
    prisma.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    const service = makeServices(prisma);
    const result = await service.create({ clientId: 'client-1', startTime: VALID_START });

    expect(['ALTERNATIVES', 'WAITLIST']).toContain(result.status);
    expect(tx.appointment.create).not.toHaveBeenCalled();
  });

  it('handles P2034 serialization failure gracefully (treated as slot taken)', async () => {
    const prisma = makePrisma();
    prisma.$transaction = jest.fn().mockRejectedValue({ code: 'P2034' });

    const service = makeServices(prisma);
    const result = await service.create({ clientId: 'client-1', startTime: VALID_START });

    expect(['ALTERNATIVES', 'WAITLIST']).toContain(result.status);
  });

  it('propagates unexpected errors (not SLOT_TAKEN or P2034)', async () => {
    const prisma = makePrisma();
    prisma.$transaction = jest.fn().mockRejectedValue(new Error('DB_CRASH'));

    const service = makeServices(prisma);
    await expect(service.create({ clientId: 'client-1', startTime: VALID_START })).rejects.toThrow('DB_CRASH');
  });

  it('rejects bookings outside working hours', async () => {
    const prisma = makePrisma();
    const service = makeServices(prisma);

    const result = await service.create({ clientId: 'client-1', startTime: '2026-06-10T07:00:00.000Z' });
    expect(result.status).toBe('REJECTED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid timestamps', async () => {
    const prisma = makePrisma();
    const service = makeServices(prisma);

    const result = await service.create({ clientId: 'client-1', startTime: 'not-a-date' });
    expect(result.status).toBe('REJECTED');
  });

  it('10 concurrent same-slot requests: exactly one PENDING_PAYMENT', async () => {
    let created = false;
    const prisma = makePrisma();
    const tx = {
      appointment: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(created ? { id: 'existing' } : null)),
        create: jest.fn().mockImplementation(() => {
          if (created) throw new Error('SLOT_TAKEN');
          created = true;
          return Promise.resolve({ id: 'appt-1' });
        }),
      },
    };
    prisma.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    const service = makeServices(prisma);
    const dto = { clientId: 'client-1', startTime: VALID_START };

    const results = await Promise.all(Array.from({ length: 10 }, () => service.create(dto)));
    const successCount = results.filter((r) => r.status === 'PENDING_PAYMENT').length;

    expect(successCount).toBe(1);
  });

  it('reschedule collision is handled gracefully', async () => {
    const prisma = makePrisma();
    const existing = {
      id: 'appt-old',
      clientId: 'client-1',
      status: 'PENDING_PAYMENT',
      startTime: new Date('2026-06-10T09:00:00.000Z'),
      endTime: new Date('2026-06-10T09:30:00.000Z'),
    };
    prisma.appointment.findUnique = jest.fn().mockResolvedValue(existing);

    const tx = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conflict' }),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    prisma.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    const service = makeServices(prisma);
    const result = await service.reschedule({ appointmentId: 'appt-old', newStartTime: VALID_START });

    expect(['ALTERNATIVES', 'WAITLIST']).toContain(result.status);
    expect(tx.appointment.update).not.toHaveBeenCalled();
  });
});
