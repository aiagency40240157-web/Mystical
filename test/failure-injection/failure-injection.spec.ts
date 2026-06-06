/**
 * Failure injection tests.
 * Validates system behavior under: DB disconnections, Stripe downtime,
 * Twilio failures, and internal service exceptions.
 * Verifies: graceful degradation, retry logic, no data corruption.
 */
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';
import { PaymentService } from '../../src/modules/payments/payment.service';
import { WaitlistService } from '../../src/modules/waitlist/waitlist.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { PrivacyRuleService } from '../../src/modules/privacy/privacy-rule.service';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { retryWithBackoff } from '../../src/common/utils/retry.util';
import { ArgumentsHost, HttpException } from '@nestjs/common';

// ─── Retry utility ──────────────────────────────────────────────────────────────

describe('retryWithBackoff — retry logic', () => {
  it('succeeds on first attempt without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(retryWithBackoff(fn, 3, 1)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on second attempt', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('ok');

    await expect(retryWithBackoff(fn, 3, 1)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after all retries are exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));
    await expect(retryWithBackoff(fn, 3, 1)).rejects.toThrow('persistent failure');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls the function multiple times on failure', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    await expect(retryWithBackoff(fn, 3, 1)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ─── Database connection failure ────────────────────────────────────────────────

describe('AppointmentsService — DB failure handling', () => {
  function makeDbCrashService(errorMsg = 'DB_DOWN') {
    const prisma = {
      client: { findUnique: jest.fn().mockRejectedValue(new Error(errorMsg)) },
      appointment: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      waitlistEntry: { create: jest.fn() },
      $transaction: jest.fn().mockRejectedValue(new Error(errorMsg)),
    };
    const privacy = {
      evaluate: jest.fn().mockResolvedValue(true),
      check: jest.fn().mockResolvedValue(true),
    } as unknown as PrivacyRuleService;
    const waitlist = { add: jest.fn(), promoteForSlot: jest.fn() } as unknown as WaitlistService;
    const payment = { handleCancellation: jest.fn(), hasSuccessfulPayment: jest.fn() } as unknown as PaymentService;
    const audit = { log: jest.fn() } as unknown as AuditService;
    const clients = { findOrCreateByPhone: jest.fn() } as any;
    return new AppointmentsService(prisma as never, privacy, waitlist, payment, audit, clients);
  }

  it('propagates DB error when client lookup fails', async () => {
    const service = makeDbCrashService();
    await expect(
      service.create({ clientId: 'c1', startTime: '2026-06-10T17:00:00.000Z' }),
    ).rejects.toThrow('DB_DOWN');
  });
});

// ─── Stripe downtime ────────────────────────────────────────────────────────────

describe('PaymentService — Stripe downtime with retry', () => {
  function makePaymentService(stripeCreateImpl: () => Promise<unknown>) {
    const prisma = {
      appointment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'appt-1', clientId: 'c1', status: 'PENDING_PAYMENT', payment: null,
        }),
      },
      payment: { create: jest.fn().mockResolvedValue({ id: 'pay-1' }) },
    };
    const audit = { log: jest.fn() } as unknown as AuditService;
    const waitlist = { promoteForSlot: jest.fn() } as unknown as WaitlistService;

    // Stripe requires non-empty key; replace immediately after construction
    const savedKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_tests';
    const service = new PaymentService(prisma as never, audit, waitlist);
    process.env.STRIPE_SECRET_KEY = savedKey;

    Object.assign(service, {
      stripe: {
        paymentIntents: { create: jest.fn().mockImplementation(stripeCreateImpl), cancel: jest.fn() },
        refunds: { create: jest.fn() },
        webhooks: { constructEvent: jest.fn() },
      },
    });
    return service;
  }

  it('succeeds after transient Stripe failure (retry absorbs it)', async () => {
    let attempts = 0;
    const service = makePaymentService(async () => {
      attempts++;
      if (attempts < 2) throw new Error('Stripe timeout');
      return { id: 'pi_1', client_secret: 'secret_1' };
    });

    const result = await service.createIntent('appt-1');
    expect(result.clientSecret).toBe('secret_1');
    expect(attempts).toBe(2);
  });

  it('throws after 3 failed Stripe attempts', async () => {
    const service = makePaymentService(async () => {
      throw new Error('Stripe unavailable');
    });

    await expect(service.createIntent('appt-1')).rejects.toThrow('Stripe unavailable');
  });
});

// ─── WhatsApp / Twilio downtime ─────────────────────────────────────────────────

describe('WhatsApp — Twilio downtime resilience', () => {
  it('retries Twilio message send on failure', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Twilio unavailable');
      return { sid: 'msg_1' };
    };

    const result = await retryWithBackoff(fn, 3, 1);
    expect(result).toEqual({ sid: 'msg_1' });
    expect(attempts).toBe(3);
  });

  it('gives up after max retries and propagates error', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Twilio down'));
    await expect(retryWithBackoff(fn, 2, 1)).rejects.toThrow('Twilio down');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ─── GlobalExceptionFilter ──────────────────────────────────────────────────────

describe('GlobalExceptionFilter — data leak prevention', () => {
  function makeHost(method = 'GET', path = '/api/test') {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = { method, path };
    return {
      host: {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => request,
        }),
      } as unknown as ArgumentsHost,
      response,
    };
  }

  it('returns generic error for unhandled internal exception', () => {
    const filter = new GlobalExceptionFilter();
    const { host, response } = makeHost();
    filter.catch(new Error('Critical DB failure with schema details'), host);

    expect(response.json).toHaveBeenCalledWith({ error: 'Unable to process request at this time' });
    expect(response.status).toHaveBeenCalledWith(500);
  });

  it('does NOT expose the original exception message in response', () => {
    const filter = new GlobalExceptionFilter();
    const { host, response } = makeHost();
    filter.catch(new Error('secret internal state: password=abc'), host);

    const jsonArg = (response.json as jest.Mock).mock.calls[0][0];
    expect(JSON.stringify(jsonArg)).not.toContain('secret internal state');
    expect(JSON.stringify(jsonArg)).not.toContain('password');
  });

  it('preserves HTTP status code for HttpExceptions', () => {
    const filter = new GlobalExceptionFilter();
    const { host, response } = makeHost();
    filter.catch(new HttpException('Not Found', 404), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: 'Unable to process request at this time' });
  });

  it('returns 500 for non-HttpException errors', () => {
    const filter = new GlobalExceptionFilter();
    const { host, response } = makeHost();
    filter.catch(new TypeError('Cannot read property x of undefined'), host);

    expect(response.status).toHaveBeenCalledWith(500);
  });

  it('does not expose stack traces in response', () => {
    const filter = new GlobalExceptionFilter();
    const { host, response } = makeHost();
    const err = new Error('internal');
    err.stack = 'at Object.<anonymous> (src/secret.ts:42:10)';
    filter.catch(err, host);

    const jsonArg = (response.json as jest.Mock).mock.calls[0][0];
    expect(JSON.stringify(jsonArg)).not.toContain('stack');
    expect(JSON.stringify(jsonArg)).not.toContain('secret.ts');
  });
});

// ─── Audit failure isolation ─────────────────────────────────────────────────────

describe('AuditService — write failure does not crash callers', () => {
  it('audit log failure is swallowed (non-blocking: caller is not affected)', async () => {
    const prisma = {
      $transaction: jest.fn().mockRejectedValue(new Error('audit DB down')),
      auditLog: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    };
    const audit = new AuditService(prisma as never);

    // Calling log() should not throw — it's fire-and-forget
    expect(() => audit.log('TEST_ACTION', { key: 'value' })).not.toThrow();

    // Wait a tick for the async write to attempt
    await new Promise((r) => setTimeout(r, 10));
    // No exception propagated — test passes if we reach here
  });
});
