import { Injectable } from '@nestjs/common';

@Injectable()
export class ReminderService {
  // Reminders are sent by the WhatsApp bot (chatbot-mvp/index.js).
  // The bot polls GET /api/appointments/pending-reminders?window=24h|5h every 5 minutes
  // and sends messages directly via whatsapp-web.js.
}
