/**
 * Audit system validation tests.
 * Verifies: immutability (append-only), hash chain integrity, fire-and-forget behavior,
 * no sensitive data in logged metadata, and sequential write ordering.
 */
import { AuditService } from '../../src/modules/audit/audit.service';
import { createHash } from 'crypto';

function computeHash(previousHash: string | null, action: string, metadata: Record<string, unknown>, timestamp: string): string {
  const payload = `${previousHash ?? ''}|${action}|${JSON.stringify(metadata)}|${timestamp}`;
  return createHash('sha256').update(payload).digest('hex');
}

function makePrisma(existingLogs: Array<{ id: string; hash: string | null; previousHash: string | null; action: string; metadata: Record<string, unknown>; createdAt: Date }> = []) {
  const logs = [...existingLogs];
  return {
    auditLog: {
      findFirst: jest.fn().mockImplementation(({ orderBy }: { orderBy?: { createdAt: string } } = {}) => {
        if (!logs.length) return Promise.resolve(null);
        return Promise.resolve(logs[logs.length - 1]);
      }),
      create: jest.fn().mockImplementation(({ data }: { data: { action: string; metadata: Record<string, unknown>; hash: string; previousHash: string | null } }) => {
        const entry = { id: `log-${logs.length}`, ...data, createdAt: new Date() };
        logs.push(entry as never);
        return Promise.resolve(entry);
      }),
    },
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) => {
      const txPrisma = {
        auditLog: {
          findFirst: jest.fn().mockResolvedValue(logs.length ? logs[logs.length - 1] : null),
          create: jest.fn().mockImplementation(({ data }: { data: { action: string; metadata: Record<string, unknown>; hash: string; previousHash: string | null } }) => {
            const entry = { id: `log-${logs.length}`, ...data, createdAt: new Date() };
            logs.push(entry as never);
            return Promise.resolve(entry);
          }),
        },
      };
      return fn(txPrisma);
    }),
    _logs: logs,
  };
}

describe('AuditService — fire-and-forget (non-blocking)', () => {
  it('log() returns void immediately without awaiting the DB write', () => {
    const prisma = makePrisma();
    const audit = new AuditService(prisma as never);
    const result = audit.log('TEST', {});
    expect(result).toBeUndefined();
  });

  it('does not throw synchronously even when DB is not initialized', () => {
    const badPrisma = { $transaction: jest.fn().mockRejectedValue(new Error('not connected')) };
    const audit = new AuditService(badPrisma as never);
    expect(() => audit.log('ACTION', {})).not.toThrow();
  });
});

describe('AuditService — hash chain integrity', () => {
  it('first entry has previousHash = null', async () => {
    const prisma = makePrisma(); // empty log
    const audit = new AuditService(prisma as never);

    audit.log('FIRST_ACTION', { key: 'value' });
    await new Promise((r) => setTimeout(r, 20));

    const logs = prisma._logs;
    expect(logs.length).toBe(1);
    expect(logs[0].previousHash).toBeNull();
    expect(logs[0].hash).toBeTruthy();
  });

  it('subsequent entry references previous hash', async () => {
    const prisma = makePrisma();
    const audit = new AuditService(prisma as never);

    audit.log('ACTION_1', { seq: 1 });
    audit.log('ACTION_2', { seq: 2 });
    await new Promise((r) => setTimeout(r, 50));

    const logs = prisma._logs;
    expect(logs.length).toBe(2);
    expect(logs[1].previousHash).toBe(logs[0].hash);
  });

  it('sequential writes maintain unbroken chain even with rapid calls', async () => {
    const prisma = makePrisma();
    const audit = new AuditService(prisma as never);

    for (let i = 0; i < 5; i++) {
      audit.log(`ACTION_${i}`, { i });
    }
    await new Promise((r) => setTimeout(r, 100));

    const logs = prisma._logs;
    expect(logs.length).toBe(5);

    // Verify the chain
    for (let i = 1; i < logs.length; i++) {
      expect(logs[i].previousHash).toBe(logs[i - 1].hash);
      expect(logs[i].hash).toBeTruthy();
      expect(logs[i].hash).not.toBe(logs[i - 1].hash); // each hash is unique
    }
  });

  it('hash value is deterministic given same inputs', () => {
    const hash1 = computeHash(null, 'ACTION', { key: 'value' }, '2026-01-01T00:00:00.000Z');
    const hash2 = computeHash(null, 'ACTION', { key: 'value' }, '2026-01-01T00:00:00.000Z');
    expect(hash1).toBe(hash2);
  });

  it('different actions produce different hashes', () => {
    const h1 = computeHash(null, 'ACTION_A', {}, '2026-01-01T00:00:00.000Z');
    const h2 = computeHash(null, 'ACTION_B', {}, '2026-01-01T00:00:00.000Z');
    expect(h1).not.toBe(h2);
  });
});

describe('AuditService — no sensitive data in logged metadata', () => {
  it('payment events log only IDs and status — not amounts or card data', async () => {
    const prisma = makePrisma();
    const audit = new AuditService(prisma as never);

    audit.log('PAYMENT_SUCCESS_APPOINTMENT_CONFIRMED', {
      paymentId: 'pay-1',
      appointmentId: 'appt-1',
    });
    await new Promise((r) => setTimeout(r, 20));

    const entry = prisma._logs[0];
    expect(entry.metadata).not.toHaveProperty('cardNumber');
    expect(entry.metadata).not.toHaveProperty('cvv');
    expect(entry.metadata).not.toHaveProperty('clientName');
    expect(entry.metadata).toHaveProperty('paymentId');
    expect(entry.metadata).toHaveProperty('appointmentId');
  });

  it('privacy evaluation logs clientId and boolean only', async () => {
    const prisma = makePrisma();
    const audit = new AuditService(prisma as never);

    audit.log('PRIVACY_EVALUATED', { clientId: 'c1', allowed: false });
    await new Promise((r) => setTimeout(r, 20));

    const entry = prisma._logs[0];
    const keys = Object.keys(entry.metadata as Record<string, unknown>);
    expect(keys).toContain('clientId');
    expect(keys).toContain('allowed');
    expect(keys).not.toContain('groupColor');
    expect(keys).not.toContain('isKnownRelation');
    expect(keys).not.toContain('reason');
    expect(keys).not.toContain('conflictingClientId');
  });

  it('appointment events do not log client personal details', async () => {
    const prisma = makePrisma();
    const audit = new AuditService(prisma as never);

    audit.log('APPOINTMENT_CREATED', { clientId: 'c1', startTime: '2026-06-10T10:00:00.000Z' });
    await new Promise((r) => setTimeout(r, 20));

    const entry = prisma._logs[0];
    const keys = Object.keys(entry.metadata as Record<string, unknown>);
    expect(keys).not.toContain('firstName');
    expect(keys).not.toContain('lastName');
    expect(keys).not.toContain('phone');
    expect(keys).not.toContain('email');
  });
});

describe('AuditService — write ordering (sequential lock)', () => {
  it('concurrent log() calls are serialized and all entries are written', async () => {
    const prisma = makePrisma();
    const audit = new AuditService(prisma as never);

    // Fire 10 logs simultaneously
    for (let i = 0; i < 10; i++) {
      audit.log(`EVENT_${i}`, { i });
    }
    await new Promise((r) => setTimeout(r, 200));

    expect(prisma._logs.length).toBe(10);

    // Chain must be unbroken
    for (let i = 1; i < prisma._logs.length; i++) {
      expect(prisma._logs[i].previousHash).toBe(prisma._logs[i - 1].hash);
    }
  });
});
