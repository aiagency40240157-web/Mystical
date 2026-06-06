import { Injectable } from '@nestjs/common';

const FORBIDDEN_PATTERNS = [
  /\bother client\b/i,
  /\banother client\b/i,
  /\bprivacy\b/i,
  /\bconflict\b/i,
  /\bdatabase\b/i,
  /\bsql\b/i,
  /\binternal\b/i,
  /\bexception\b/i,
  /\bstack\b/i,
  // UUIDs — expose nothing about internal IDs
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
];

const FALLBACK: Record<string, string> = {
  en: 'This action cannot be completed at this time. Please try again.',
  es: 'Esta acción no se puede completar en este momento. Por favor intente de nuevo.',
};

@Injectable()
export class ResponseSafetyLayerService {
  filter(message: string, language: 'en' | 'es'): string {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(message)) {
        return FALLBACK[language] ?? FALLBACK.en;
      }
    }
    return message;
  }
}
