/**
 * Privacy engine validation tests.
 * Verifies: break overlap, known-relation 4h gap, RED/YELLOW group color conflict,
 * combined constraint edge cases, and that the engine logs decisions without
 * leaking any reasoning or relationship data.
 */
import { PrivacyRuleService } from '../../src/modules/privacy/privacy-rule.service';
import { AuditService } from '../../src/modules/audit/audit.service';

const BREAK_OVERLAP_START = new Date('2026-06-10T20:30:00.000Z'); // exactly break start (13:30 PDT)
const BREAK_OVERLAP_END = new Date('2026-06-10T21:00:00.000Z'); // 14:00 PDT
const SAFE_START = new Date('2026-06-10T17:00:00.000Z'); // 10:00 AM PDT
const SAFE_END = new Date('2026-06-10T17:30:00.000Z'); // 10:30 AM PDT

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    client: { findUnique: jest.fn() },
    appointment: { findFirst: jest.fn().mockResolvedValue(null) },
    relationship: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = makePrisma(prismaOverrides);
  const audit = { log: jest.fn() } as unknown as AuditService;
  return { service: new PrivacyRuleService(prisma as never, audit), prisma, audit };
}

describe('Privacy Engine — break time enforcement', () => {
  it('rejects a slot that starts exactly at break start', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: null });

    const result = await service.evaluate({ clientId: 'c1', startTime: BREAK_OVERLAP_START, endTime: BREAK_OVERLAP_END });
    expect(result).toBe(false);
  });

  it('rejects a slot that ends during break', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: null });

    const start = new Date('2026-06-10T20:00:00.000Z'); // 13:00 PDT
    const endOverlap = new Date('2026-06-10T20:45:00.000Z'); // 13:45 PDT, overlaps break
    const result = await service.evaluate({ clientId: 'c1', startTime: start, endTime: endOverlap });
    expect(result).toBe(false);
  });

  it('allows a slot that ends exactly at break start (no overlap)', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: null });

    const start = new Date('2026-06-10T20:00:00.000Z'); // 13:00 PDT
    const end = new Date('2026-06-10T20:30:00.000Z'); // 13:30 PDT
    const result = await service.evaluate({ clientId: 'c1', startTime: start, endTime: end });
    expect(result).toBe(true);
  });

  it('allows a slot after the break', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: null });

    const start = new Date('2026-06-10T21:15:00.000Z'); // 14:15 PDT
    const end = new Date('2026-06-10T21:45:00.000Z'); // 14:45 PDT
    const result = await service.evaluate({ clientId: 'c1', startTime: start, endTime: end });
    expect(result).toBe(true);
  });
});

describe('Privacy Engine — known-relation 4h gap', () => {
  it('rejects when another known-relation client has an appointment within 4h', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: true, groupColor: null });
    prisma.relationship.findMany.mockResolvedValue([{ clientAId: 'c1', clientBId: 'c2', confirmed: true }]);
    prisma.appointment.findFirst.mockResolvedValue({ id: 'appt-existing' }); // conflict found

    const result = await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(false);
  });

  it('allows when no other known-relation appointment is within 4h', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: true, groupColor: null });
    prisma.relationship.findMany.mockResolvedValue([{ clientAId: 'c1', clientBId: 'c2', confirmed: true }]);
    prisma.appointment.findFirst.mockResolvedValue(null); // no conflict

    const result = await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(true);
  });

  it('skips gap check for non-relation clients', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: null });

    const result = await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(true);
    // findFirst is never called for known-relation check
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
  });
});

describe('Privacy Engine — RED/YELLOW group color conflict', () => {
  it('rejects RED client when YELLOW has appointment same day', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: 'RED' });
    prisma.appointment.findFirst.mockResolvedValue({ id: 'yellow-appt' }); // opposite color conflict

    const result = await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(false);
  });

  it('rejects YELLOW client when RED has appointment same day', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: 'YELLOW' });
    prisma.appointment.findFirst.mockResolvedValue({ id: 'red-appt' });

    const result = await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(false);
  });

  it('allows RED client when no YELLOW appointment exists same day', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: 'RED' });
    prisma.appointment.findFirst.mockResolvedValue(null);

    const result = await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(true);
  });

  it('allows BLUE client regardless (no color rule applies)', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: 'BLUE' });

    const result = await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(true);
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
  });

  it('allows NULL color client', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: 'NULL' });

    const result = await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(true);
  });
});

describe('Privacy Engine — combined constraints', () => {
  it('rejects when both relation gap and color conflict apply', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: true, groupColor: 'RED' });
    // Both conflict checks return a conflict
    prisma.appointment.findFirst.mockResolvedValue({ id: 'conflict' });

    const result = await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(false);
  });

  it('returns false when client does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.client.findUnique.mockResolvedValue(null);

    const result = await service.evaluate({ clientId: 'nonexistent', startTime: SAFE_START, endTime: SAFE_END });
    expect(result).toBe(false);
  });
});

describe('Privacy Engine — audit logging (no data leaks)', () => {
  it('logs PRIVACY_EVALUATED with clientId and boolean allowed — no reasoning', async () => {
    const { service, prisma, audit } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: null });

    await service.evaluate({ clientId: 'c1', startTime: SAFE_START, endTime: SAFE_END });

    expect(audit.log).toHaveBeenCalledWith('PRIVACY_EVALUATED', expect.objectContaining({
      clientId: 'c1',
      allowed: true,
    }));
    const loggedMetadata = (audit.log as jest.Mock).mock.calls[0][1];
    expect(Object.keys(loggedMetadata)).not.toContain('groupColor');
    expect(Object.keys(loggedMetadata)).not.toContain('isKnownRelation');
    expect(Object.keys(loggedMetadata)).not.toContain('conflict');
    expect(Object.keys(loggedMetadata)).not.toContain('reason');
  });

  it('logs allowed: false when privacy check fails', async () => {
    const { service, prisma, audit } = makeService();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1', isKnownRelation: false, groupColor: null });

    await service.evaluate({ clientId: 'c1', startTime: BREAK_OVERLAP_START, endTime: BREAK_OVERLAP_END });

    expect(audit.log).toHaveBeenCalledWith('PRIVACY_EVALUATED', { clientId: 'c1', allowed: false });
  });
});
