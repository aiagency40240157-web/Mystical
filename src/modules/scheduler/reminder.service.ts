import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { AICommunicationService } from '../ai-communication/ai-communication.service';
import { ResponseSafetyLayerService } from '../ai-communication/response-safety-layer.service';
import { formatPacific } from '../../common/utils/timezone.util';

const WINDOW_MS = 5 * 60 * 1000; // ±5 min tolerance

@Injectable()
export class ReminderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly aiCommunication: AICommunicationService,
    private readonly safetyLayer: ResponseSafetyLayerService,
  ) {}

  @Cron('0 */5 * * * *')
  async checkReminders(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    await this.send5hReminders();
    await this.send1hReminders();
  }

  private async send5hReminders(): Promise<void> {
    const target = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent5h: false,
        startTime: {
          gte: new Date(target.getTime() - WINDOW_MS),
          lte: new Date(target.getTime() + WINDOW_MS),
        },
      },
      include: { client: true },
    });

    for (const appt of appointments) {
      const lang = (appt.client.preferredLanguage as 'en' | 'es') ?? 'en';
      const time = formatPacific(appt.startTime, lang === 'es' ? 'es-MX' : 'en-US');
      const raw =
        lang === 'es'
          ? `Recordatorio: tiene una cita el ${time}. Por favor confírmela o cancele con anticipación.`
          : `Reminder: you have an appointment at ${time}. Please confirm or cancel in advance.`;
      const message = this.safetyLayer.filter(raw, lang);

      if (appt.client.phone) {
        await this.whatsapp.sendMessage(appt.client.phone, message);
      }

      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSent5h: true },
      });
    }
  }

  private async send1hReminders(): Promise<void> {
    const target = new Date(Date.now() + 1 * 60 * 60 * 1000);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent1h: false,
        startTime: {
          gte: new Date(target.getTime() - WINDOW_MS),
          lte: new Date(target.getTime() + WINDOW_MS),
        },
      },
      include: { client: true },
    });

    for (const appt of appointments) {
      const lang = (appt.client.preferredLanguage as 'en' | 'es') ?? 'en';
      const time = formatPacific(appt.startTime, lang === 'es' ? 'es-MX' : 'en-US');
      const raw =
        lang === 'es'
          ? `Su cita es en 1 hora (${time}). No asistir puede resultar en cargo de penalidad.`
          : `Your appointment is in 1 hour (${time}). Not attending may result in a penalty charge.`;
      const message = this.safetyLayer.filter(raw, lang);

      if (appt.client.phone) {
        await this.whatsapp.sendMessage(appt.client.phone, message);
      }

      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSent1h: true },
      });
    }
  }
}
