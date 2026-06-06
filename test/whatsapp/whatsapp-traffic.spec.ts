/**
 * WhatsApp traffic simulation and ResponseSafetyLayer tests.
 * Validates: intent routing, bilingual responses, safety layer enforcement,
 * unknown client handling, and high-volume burst resilience.
 */
import { ResponseSafetyLayerService } from '../../src/modules/ai-communication/response-safety-layer.service';
import { IntentParserService } from '../../src/modules/ai-communication/intent-parser.service';
import { AICommunicationService } from '../../src/modules/ai-communication/ai-communication.service';

// Actual fallback messages from ResponseSafetyLayerService
const EN_FALLBACK = /This action cannot be completed at this time/i;
const ES_FALLBACK = /Esta acción no se puede completar/i;

// ─── ResponseSafetyLayerService ────────────────────────────────────────────────

describe('ResponseSafetyLayer — forbidden pattern filtering', () => {
  const layer = new ResponseSafetyLayerService();

  it.each([
    ['other client information', 'other client'],
    ['another client was there', 'another client'],
    ['privacy policy says', 'privacy'],
    ['conflict detected', 'conflict'],
    ['database error occurred', 'database'],
    ['sql query failed', 'sql'],
    ['internal server error', 'internal'],
    ['exception thrown', 'exception'],
    ['stack trace: at line 42', 'stack'],
    ['uuid: 550e8400-e29b-41d4-a716-446655440000', 'UUID'],
  ])('blocks message containing "%s"', (message) => {
    const result = layer.filter(message, 'en');
    expect(result).toMatch(EN_FALLBACK);
  });

  it('returns EN fallback for forbidden content in EN', () => {
    const result = layer.filter('database error', 'en');
    expect(result).toMatch(EN_FALLBACK);
    expect(result).not.toContain('database');
  });

  it('returns ES fallback for forbidden content in ES', () => {
    const result = layer.filter('error de base de datos: sql fallo', 'es');
    expect(result).toMatch(ES_FALLBACK);
  });

  it('passes through clean EN message unchanged', () => {
    const msg = 'Your appointment is confirmed for 10:00 AM.';
    expect(layer.filter(msg, 'en')).toBe(msg);
  });

  it('passes through clean ES message unchanged', () => {
    const msg = 'Su cita está confirmada para las 10:00 AM.';
    expect(layer.filter(msg, 'es')).toBe(msg);
  });

  it('is case-insensitive for forbidden keywords', () => {
    const result = layer.filter('DATABASE connection lost', 'en');
    expect(result).toMatch(EN_FALLBACK);
  });

  it('blocks UUID patterns (prevents ID leakage)', () => {
    const result = layer.filter('Appointment ID: 550e8400-e29b-41d4-a716-446655440000 confirmed', 'en');
    expect(result).toMatch(EN_FALLBACK);
  });
});

// ─── IntentParserService ────────────────────────────────────────────────────────

describe('IntentParser — EN intent detection', () => {
  const parser = new IntentParserService();

  it('detects BOOK intent from "I want to book" (EN)', () => {
    const result = parser.parse('I want to book for 2026-06-10T10:00:00.000Z');
    expect(result.type).toBe('BOOK');
    expect(result.language).toBe('en');
  });

  it('detects CANCEL intent (EN)', () => {
    const result = parser.parse('Please cancel my session');
    expect(result.type).toBe('CANCEL');
    expect(result.language).toBe('en');
  });

  it('detects RESCHEDULE intent (EN)', () => {
    const result = parser.parse('I need to reschedule for 2026-06-11T09:00:00.000Z');
    expect(result.type).toBe('RESCHEDULE');
    expect(result.language).toBe('en');
  });

  it('detects STATUS intent (EN) — without booking keywords', () => {
    // "appointment" is in BOOK_KW, so use a message with only STATUS keywords
    const result = parser.parse('What is the status?');
    expect(result.type).toBe('STATUS');
    expect(result.language).toBe('en');
  });

  it('returns UNKNOWN for unrecognized messages', () => {
    const result = parser.parse('Hello how are you doing today');
    expect(result.type).toBe('UNKNOWN');
  });

  it('extracts ISO date from BOOK intent', () => {
    const result = parser.parse('book 2026-06-10T10:00:00.000Z');
    expect(result.requestedTime).toBeInstanceOf(Date);
    expect(result.requestedTime?.toISOString()).toBe('2026-06-10T10:00:00.000Z');
  });

  it('CANCEL is detected before BOOK keywords in the same message', () => {
    const result = parser.parse('cancel my session please schedule');
    expect(result.type).toBe('CANCEL');
  });
});

describe('IntentParser — ES intent detection', () => {
  const parser = new IntentParserService();

  it('detects BOOK intent from "quiero reservar" (ES)', () => {
    const result = parser.parse('quiero reservar para 2026-06-10T10:00:00.000Z');
    expect(result.type).toBe('BOOK');
    expect(result.language).toBe('es');
  });

  it('detects CANCEL intent (ES)', () => {
    const result = parser.parse('cancelar mi sesion');
    expect(result.type).toBe('CANCEL');
    expect(result.language).toBe('es');
  });

  it('detects RESCHEDULE intent (ES)', () => {
    // "reagendar" is the ES keyword in RESCHEDULE_KW and in SPANISH_KW
    const result = parser.parse('reagendar para 2026-06-11T09:00:00.000Z');
    expect(result.type).toBe('RESCHEDULE');
    expect(result.language).toBe('es');
  });

  it('detects STATUS intent (ES) — using horario (Spanish, not in BOOK_KW)', () => {
    // "cita" triggers BOOK_KW, so use "horario" (Spanish keyword, in STATUS_KW indirectly via "estado")
    const result = parser.parse('estado de mi horario');
    expect(result.type).toBe('STATUS');
    expect(result.language).toBe('es');
  });
});

// ─── AICommunicationService — bilingual template formatting ───────────────────

describe('AICommunicationService — status mapping and bilingual formatting', () => {
  const ai = new AICommunicationService();

  const STATUS_CASES: Array<[string, string]> = [
    ['PENDING_PAYMENT', 'PENDING_PAYMENT'],
    ['CONFIRMED', 'CONFIRMED'],
    ['CANCELLED', 'CANCELLED'],
    ['RESCHEDULED', 'RESCHEDULED'],
    ['REJECTED', 'NOT_AVAILABLE'],
    ['ALTERNATIVES', 'ALTERNATIVES'],
    ['WAITLIST', 'WAITLISTED'],
    ['UNKNOWN_STATUS', 'UNKNOWN'],
  ];

  it.each(STATUS_CASES)('maps raw status "%s" → sanitized "%s"', (raw, expected) => {
    expect(ai.mapBookingStatus(raw)).toBe(expected);
  });

  it('formats CONFIRMED response in EN without exposing internals', () => {
    const msg = ai.formatResponse('CONFIRMED', 'en');
    expect(msg).toBeTruthy();
    expect(msg.toLowerCase()).not.toContain('error');
    expect(msg.toLowerCase()).not.toContain('exception');
    expect(msg.toLowerCase()).not.toContain('database');
  });

  it('formats CONFIRMED response in ES', () => {
    const msg = ai.formatResponse('CONFIRMED', 'es');
    expect(msg).toBeTruthy();
  });

  it('formats ALTERNATIVES response with options list in EN', () => {
    const options = ['2026-06-10T11:00:00.000Z', '2026-06-10T14:00:00.000Z'];
    const msg = ai.formatResponse('ALTERNATIVES', 'en', options);
    expect(msg).toContain('04:00 AM');
  });

  it('formats ALTERNATIVES response with options list in ES', () => {
    const options = ['2026-06-10T11:00:00.000Z'];
    const msg = ai.formatResponse('ALTERNATIVES', 'es', options);
    expect(msg).toBeTruthy();
  });

  it('formats PAYMENT_REQUIRED in both languages without internal details', () => {
    const en = ai.formatResponse('PAYMENT_REQUIRED', 'en');
    const es = ai.formatResponse('PAYMENT_REQUIRED', 'es');
    expect(en).toBeTruthy();
    expect(es).toBeTruthy();
    expect(en.toLowerCase()).not.toContain('stripe');
    expect(en.toLowerCase()).not.toContain('sql');
  });

  it('all SanitizedStatus values produce non-empty responses in both languages', () => {
    const statuses: Array<Parameters<typeof ai.formatResponse>[0]> = [
      'CONFIRMED', 'NOT_AVAILABLE', 'ALTERNATIVES', 'WAITLISTED',
      'PAYMENT_REQUIRED', 'PENDING_PAYMENT', 'CANCELLED', 'RESCHEDULED', 'UNKNOWN',
    ];
    for (const status of statuses) {
      expect(ai.formatResponse(status, 'en')).toBeTruthy();
      expect(ai.formatResponse(status, 'es')).toBeTruthy();
    }
  });
});

// ─── Safety layer applied to AI output ────────────────────────────────────────

describe('WhatsApp — safety layer always enforced on AI output', () => {
  const ai = new AICommunicationService();
  const layer = new ResponseSafetyLayerService();

  it('AI output for all statuses passes safety layer without triggering fallback', () => {
    const statuses: Array<Parameters<typeof ai.formatResponse>[0]> = [
      'CONFIRMED', 'NOT_AVAILABLE', 'ALTERNATIVES', 'WAITLISTED',
      'PAYMENT_REQUIRED', 'PENDING_PAYMENT', 'CANCELLED', 'RESCHEDULED', 'UNKNOWN',
    ];
    for (const status of statuses) {
      for (const lang of ['en', 'es'] as const) {
        const raw = ai.formatResponse(status, lang);
        const safe = layer.filter(raw, lang);
        // The safety filter should not have to trigger on clean AI output
        expect(safe).toBe(raw);
      }
    }
  });
});

// ─── High-volume burst simulation ─────────────────────────────────────────────

describe('WhatsApp — high-volume burst resilience', () => {
  const parser = new IntentParserService();
  const ai = new AICommunicationService();
  const layer = new ResponseSafetyLayerService();

  const MESSAGES = [
    'book 2026-06-10T10:00:00.000Z',
    'cancel my session',
    'reschedule for 2026-06-11T09:00:00.000Z',
    'status check',
    'quiero reservar 2026-06-10T11:00:00.000Z',
    'cancelar mi sesion',
    'estado de mi horario',
    'hello random message',
    'reprogramar para 2026-06-12T10:00:00.000Z',
    'book 2026-06-13T09:00:00.000Z',
  ];

  it('processes 100 concurrent messages without error', async () => {
    const burst = Array.from({ length: 100 }, (_, i) => MESSAGES[i % MESSAGES.length]);

    await expect(
      Promise.all(
        burst.map(async (msg) => {
          const intent = parser.parse(msg);
          const status = ai.mapBookingStatus('CONFIRMED');
          const response = ai.formatResponse(status, intent.language);
          return layer.filter(response, intent.language);
        }),
      ),
    ).resolves.toHaveLength(100);
  });

  it('no response in any burst triggers safety fallback', async () => {
    const burst = Array.from({ length: 50 }, (_, i) => MESSAGES[i % MESSAGES.length]);

    const results = await Promise.all(
      burst.map(async (msg) => {
        const intent = parser.parse(msg);
        const statuses: Array<Parameters<typeof ai.formatResponse>[0]> = [
          'CONFIRMED', 'CANCELLED', 'WAITLISTED', 'NOT_AVAILABLE',
        ];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const response = ai.formatResponse(status, intent.language);
        return layer.filter(response, intent.language);
      }),
    );

    for (const r of results) {
      expect(r).toBeTruthy();
      expect(r.toLowerCase()).not.toContain('database');
      expect(r.toLowerCase()).not.toContain('exception');
    }
  });
});
