import { Injectable } from '@nestjs/common';
import { formatPacific } from '../../common/utils/timezone.util';

export type SanitizedStatus =
  | 'CONFIRMED'
  | 'NOT_AVAILABLE'
  | 'ALTERNATIVES'
  | 'WAITLISTED'
  | 'PAYMENT_REQUIRED'
  | 'PENDING_PAYMENT'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'UNKNOWN';

const formatTime = (iso: string): string => formatPacific(new Date(iso));

type Templates = Record<SanitizedStatus, string | ((opts: string[]) => string)>;

const MESSAGES: Record<'en' | 'es', Templates> = {
  en: {
    CONFIRMED: 'Your appointment is confirmed.',
    NOT_AVAILABLE: 'This time is not available.',
    ALTERNATIVES: (opts: string[]) =>
      `This time is not available. Options: ${opts.map(formatTime).join(' | ')}.`,
    WAITLISTED: 'You have been added to the waitlist.',
    PAYMENT_REQUIRED: 'A $20 deposit is required to confirm your appointment.',
    PENDING_PAYMENT: 'Your slot is reserved. Please complete the $20 payment to confirm.',
    CANCELLED: 'Your appointment has been cancelled.',
    RESCHEDULED: 'Your appointment has been rescheduled.',
    UNKNOWN:
      'I did not understand your request. Please send the date and time to book (e.g. 2024-06-15T10:00).',
  },
  es: {
    CONFIRMED: 'Su cita está confirmada.',
    NOT_AVAILABLE: 'Este horario no está disponible.',
    ALTERNATIVES: (opts: string[]) =>
      `Este horario no está disponible. Opciones: ${opts.map(formatTime).join(' | ')}.`,
    WAITLISTED: 'Ha sido añadido a la lista de espera.',
    PAYMENT_REQUIRED: 'Se requiere un pago de $20 para confirmar su cita.',
    PENDING_PAYMENT: 'Su horario está reservado. Por favor complete el pago de $20 para confirmar.',
    CANCELLED: 'Su cita ha sido cancelada.',
    RESCHEDULED: 'Su cita ha sido reagendada.',
    UNKNOWN:
      'No entendí su solicitud. Por favor envíe la fecha y hora para reservar (ej. 2024-06-15T10:00).',
  },
};

@Injectable()
export class AICommunicationService {
  formatResponse(status: SanitizedStatus, language: 'en' | 'es', options?: string[]): string {
    const lang = language in MESSAGES ? language : 'en';
    const template = MESSAGES[lang][status];
    if (typeof template === 'function') {
      return template(options ?? []);
    }
    return template;
  }

  // Maps BookingResponse status → SanitizedStatus (AI never sees raw BookingResponse types)
  mapBookingStatus(
    raw: string,
  ): SanitizedStatus {
    const map: Record<string, SanitizedStatus> = {
      CONFIRMED: 'CONFIRMED',
      PENDING_PAYMENT: 'PENDING_PAYMENT',
      REJECTED: 'NOT_AVAILABLE',
      ALTERNATIVES: 'ALTERNATIVES',
      WAITLIST: 'WAITLISTED',
      CANCELLED: 'CANCELLED',
      RESCHEDULED: 'RESCHEDULED',
    };
    return map[raw] ?? 'UNKNOWN';
  }
}
