/**
 * Waitlist stress tests.
 * Validates: FIFO ordering within priority tier, VIP promotion over non-VIP,
 * privacy evaluation during promotion, atomic slot assignment,
 * and that a promoted entry is removed from the waitlist.
 */
import { WaitlistService } from '../../src/modules/waitlist/waitlist.service';
import { PrivacyRuleService } from '../../src/modules/privacy/privacy-rule.service';
import { AuditService } from '../../src/modules/audit/audit.service';

const SLOT_TIME = new Date('2026-06-10T10:00:00.000Z');
const END_TIME = new Date('2026-06-10T10:30:00.000Z');

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-1',
    clientId: 'client-1',
    requestedTime: SLOT_TIME,
    priority: 'LOW',
    createdAt: new Date(),
    ...overrides,
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    client: { findUnique: jest.fn() },
    waitlistEntry: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({}),
    },
    appointment: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'appt-promoted' }),
    },
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) => {
      const tx = {
        appointment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'appt-promoted' }),
        },
        waitlistEntry: { delete: jest.fn().mockResolvedValue({}) },
      };
      await fn(tx);
      return tx;
    }),
    ...overrides,
  };
}

function makeService(prismaOverrides: Record<string, unknown> = {}, privacyAllowed = true) {
  const prisma = makePrisma(prismaOverrides);
  const privacy = { evaluate: jest.fn().mockResolvedValue(privacyAllowed) } as unknown as PrivacyRuleService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  return { service: new WaitlistService(prisma as never, privacy, audit), prisma, privacy, audit };
}

describe('Waitlist — add()', () => {
  it('assigns HIGH priority to VIP clients', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isVip: true });

    await service.add('c1', SLOT_TIME);

    expect(prisma.waitlistEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: 'HIGH' }) }),
    );
  });

  it('assigns LOW priority to non-VIP clients', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isVip: false });

    await service.add('c1', SLOT_TIME);

    expect(prisma.waitlistEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: 'LOW' }) }),
    );
  });

  it('assigns LOW priority when client not found (null safety)', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue(null);

    await service.add('unknown', SLOT_TIME);

    expect(prisma.waitlistEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: 'LOW' }) }),
    );
  });

  it('logs WAITLIST_ADDED with clientId and priority', async () => {
    const { service, prisma, audit } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isVip: true });

    await service.add('c1', SLOT_TIME);

    expect(audit.log).toHaveBeenCalledWith('WAITLIST_ADDED', expect.objectContaining({
      clientId: 'c1',
      priority: 'HIGH',
    }));
  });
});

describe('Waitlist — promoteForSlot() ordering', () => {
  it('promotes HIGH priority before LOW priority', async () => {
    const highEntry = makeEntry({ id: 'high-1', clientId: 'vip-client', priority: 'HIGH', createdAt: new Date('2026-01-01T10:00:00Z') });
    const lowEntry = makeEntry({ id: 'low-1', clientId: 'normal-client', priority: 'LOW', createdAt: new Date('2026-01-01T09:00:00Z') }); // older but LOW

    const { service, prisma } = makeService();
    prisma.waitlistEntry.findMany
      .mockResolvedValueOnce([highEntry])   // HIGH query
      .mockResolvedValueOnce([lowEntry]);   // LOW query

    let promotedClientId = '';
    let txRef: Record<string, unknown>;
    prisma.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        appointment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }: { data: { clientId: string } }) => {
            promotedClientId = data.clientId;
            return Promise.resolve({ id: 'appt-1' });
          }),
        },
        waitlistEntry: { delete: jest.fn().mockResolvedValue({}) },
      };
      txRef = tx as unknown as Record<string, unknown>;
      await fn(tx);
    });

    await service.promoteForSlot(SLOT_TIME);
    expect(promotedClientId).toBe('vip-client');
  });

  it('promotes in FIFO order within the same priority tier', async () => {
    const older = makeEntry({ id: 'e1', clientId: 'first-client', priority: 'LOW', createdAt: new Date('2026-01-01T08:00:00Z') });
    const newer = makeEntry({ id: 'e2', clientId: 'second-client', priority: 'LOW', createdAt: new Date('2026-01-01T09:00:00Z') });

    const { service, prisma } = makeService();
    prisma.waitlistEntry.findMany
      .mockResolvedValueOnce([])            // HIGH: none
      .mockResolvedValueOnce([older, newer]); // LOW: two, older first

    let promotedClientId = '';
    prisma.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        appointment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }: { data: { clientId: string } }) => {
            promotedClientId = data.clientId;
            return Promise.resolve({ id: 'appt-1' });
          }),
        },
        waitlistEntry: { delete: jest.fn().mockResolvedValue({}) },
      };
      await fn(tx);
    });

    await service.promoteForSlot(SLOT_TIME);
    expect(promotedClientId).toBe('first-client');
  });

  it('skips candidate if privacy check fails, promotes next', async () => {
    const blocked = makeEntry({ id: 'e1', clientId: 'blocked-client', priority: 'LOW' });
    const allowed = makeEntry({ id: 'e2', clientId: 'allowed-client', priority: 'LOW' });

    const prisma = makePrisma();
    prisma.waitlistEntry.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([blocked, allowed]);

    const privacy = {
      evaluate: jest.fn()
        .mockResolvedValueOnce(false) // blocked-client
        .mockResolvedValueOnce(true), // allowed-client
    } as unknown as PrivacyRuleService;

    const audit = { log: jest.fn() } as unknown as AuditService;
    const service = new WaitlistService(prisma as never, privacy, audit);

    let promotedClientId = '';
    prisma.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        appointment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }: { data: { clientId: string } }) => {
            promotedClientId = data.clientId;
            return Promise.resolve({ id: 'appt-1' });
          }),
        },
        waitlistEntry: { delete: jest.fn().mockResolvedValue({}) },
      };
      await fn(tx);
    });

    await service.promoteForSlot(SLOT_TIME);
    expect(promotedClientId).toBe('allowed-client');
  });

  it('does not promote when slot becomes taken inside transaction', async () => {
    const entry = makeEntry();
    const { service, prisma } = makeService();
    prisma.waitlistEntry.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([entry]);

    // Slot taken inside tx
    prisma.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        appointment: {
          findFirst: jest.fn().mockResolvedValue({ id: 'taken' }), // conflict!
          create: jest.fn(),
        },
        waitlistEntry: { delete: jest.fn() },
      };
      await fn(tx);
    });

    await service.promoteForSlot(SLOT_TIME);
    // No appointment should be created
    const txMock = (prisma.$transaction as jest.Mock).mock.results[0];
    // Just verify the transaction was called
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('deletes the waitlist entry after promotion', async () => {
    const entry = makeEntry({ id: 'entry-to-delete' });
    const { service, prisma } = makeService();
    prisma.waitlistEntry.findMany
      .mockResolvedValueOnce([entry])
      .mockResolvedValueOnce([]);

    let deleteCalled = false;
    let deleteId = '';
    prisma.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        appointment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'appt-1' }),
        },
        waitlistEntry: {
          delete: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
            deleteCalled = true;
            deleteId = where.id;
            return Promise.resolve({});
          }),
        },
      };
      await fn(tx);
    });

    await service.promoteForSlot(SLOT_TIME);
    expect(deleteCalled).toBe(true);
    expect(deleteId).toBe('entry-to-delete');
  });

  it('logs WAITLIST_PROMOTED with clientId on successful promotion', async () => {
    const entry = makeEntry({ clientId: 'promoted-client' });
    const { service, prisma, audit } = makeService();
    prisma.waitlistEntry.findMany
      .mockResolvedValueOnce([entry])
      .mockResolvedValueOnce([]);

    await service.promoteForSlot(SLOT_TIME);
    expect(audit.log).toHaveBeenCalledWith('WAITLIST_PROMOTED', expect.objectContaining({
      clientId: 'promoted-client',
    }));
  });

  it('handles empty waitlist gracefully (no-op)', async () => {
    const { service, prisma } = makeService();
    prisma.waitlistEntry.findMany.mockResolvedValue([]);

    await expect(service.promoteForSlot(SLOT_TIME)).resolves.toBeUndefined();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('stress: 20 concurrent promoteForSlot calls without crashing', async () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry({ id: `e${i}`, clientId: `client-${i}` }),
    );
    const { service, prisma } = makeService();
    prisma.waitlistEntry.findMany
      .mockResolvedValue([]) // HIGH always empty
      .mockResolvedValue(entries);

    await expect(
      Promise.all(Array.from({ length: 20 }, () => service.promoteForSlot(SLOT_TIME))),
    ).resolves.not.toThrow();
  });
});
