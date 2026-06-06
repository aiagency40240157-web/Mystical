import { Injectable } from '@nestjs/common';

export type IntentType = 'BOOK' | 'CANCEL' | 'RESCHEDULE' | 'STATUS' | 'UNKNOWN';

export interface ParsedIntent {
  type: IntentType;
  language: 'en' | 'es';
  requestedTime?: Date;
  appointmentId?: string;
}

const BOOK_KW = ['book', 'schedule', 'appointment', 'reservar', 'cita', 'agendar', 'quiero', 'necesito'];
const CANCEL_KW = ['cancel', 'cancelar', 'baja', 'delete'];
const RESCHEDULE_KW = ['reschedule', 'reagendar', 'cambiar', 'change', 'move', 'mover'];
const STATUS_KW = ['status', 'estado', 'check', 'verif', 'mi cita', 'my appointment'];
const SPANISH_KW = ['cita', 'reservar', 'cancelar', 'hola', 'quiero', 'necesito', 'reagendar', 'gracias', 'horario'];

@Injectable()
export class IntentParserService {
  parse(text: string): ParsedIntent {
    const lower = text.toLowerCase();
    const language = SPANISH_KW.some((w) => lower.includes(w)) ? 'es' : 'en';

    if (CANCEL_KW.some((k) => lower.includes(k))) {
      return { type: 'CANCEL', language, appointmentId: this.extractUuid(text) };
    }

    if (RESCHEDULE_KW.some((k) => lower.includes(k))) {
      return { type: 'RESCHEDULE', language, requestedTime: this.extractDateTime(text) };
    }

    if (BOOK_KW.some((k) => lower.includes(k))) {
      return { type: 'BOOK', language, requestedTime: this.extractDateTime(text) };
    }

    if (STATUS_KW.some((k) => lower.includes(k))) {
      return { type: 'STATUS', language };
    }

    return { type: 'UNKNOWN', language };
  }

  private extractDateTime(text: string): Date | undefined {
    // ISO format with T separator: 2024-01-15T10:00
    const isoT = text.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (isoT) return new Date(`${isoT[1]}T${isoT[2]}:00.000Z`);

    // Date space time: 2024-01-15 10:00
    const dateSpace = text.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})/);
    if (dateSpace) {
      const h = dateSpace[2].padStart(2, '0');
      return new Date(`${dateSpace[1]}T${h}:${dateSpace[3]}:00.000Z`);
    }

    return undefined;
  }

  private extractUuid(text: string): string | undefined {
    const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return match?.[0];
  }
}
