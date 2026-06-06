import { Injectable } from '@nestjs/common';
import twilio from 'twilio';
import { PrismaService } from '../../database/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AICommunicationService } from '../ai-communication/ai-communication.service';
import { ResponseSafetyLayerService } from '../ai-communication/response-safety-layer.service';
import { IntentParserService } from '../ai-communication/intent-parser.service';
import { retryWithBackoff } from '../../common/utils/retry.util';

@Injectable()
export class WhatsAppService {
  private readonly twilioClient: twilio.Twilio;
  private readonly fromNumber: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentsService: AppointmentsService,
    private readonly aiCommunication: AICommunicationService,
    private readonly safetyLayer: ResponseSafetyLayerService,
    private readonly intentParser: IntentParserService,
  ) {
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID ?? '',
      process.env.TWILIO_AUTH_TOKEN ?? '',
    );
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER ?? '';
  }

  async processMessage(from: string, body: string): Promise<string> {
    const intent = this.intentParser.parse(body ?? '');
    const phone = from.replace('whatsapp:', '').replace(/^\+/, '');

    const client = await this.prisma.client.findFirst({ where: { phone } });
    const language = (client?.preferredLanguage as 'en' | 'es') ?? intent.language;

    let rawStatus = 'UNKNOWN';
    let options: string[] | undefined;

    if (!client && intent.type !== 'UNKNOWN') {
      rawStatus = 'NOT_AVAILABLE';
    } else {
      switch (intent.type) {
        case 'BOOK': {
          if (!intent.requestedTime) {
            rawStatus = 'UNKNOWN';
          } else {
            const result = await this.appointmentsService.create({
              clientId: client!.id,
              startTime: intent.requestedTime.toISOString(),
            });
            rawStatus = result.status;
            options = result.options;
          }
          break;
        }

        case 'CANCEL': {
          const appt = await this.findActiveAppointment(client!.id, intent.appointmentId);
          if (!appt) {
            rawStatus = 'NOT_AVAILABLE';
          } else {
            const result = await this.appointmentsService.cancel(appt.id);
            rawStatus = result.status;
          }
          break;
        }

        case 'RESCHEDULE': {
          if (!intent.requestedTime) {
            rawStatus = 'UNKNOWN';
          } else {
            const appt = await this.findActiveAppointment(client!.id);
            if (!appt) {
              rawStatus = 'NOT_AVAILABLE';
            } else {
              const result = await this.appointmentsService.reschedule({
                appointmentId: appt.id,
                newStartTime: intent.requestedTime.toISOString(),
              });
              rawStatus = result.status;
              options = result.options;
            }
          }
          break;
        }

        case 'STATUS': {
          const appt = await this.findActiveAppointment(client!.id);
          rawStatus = appt ? appt.status : 'NOT_AVAILABLE';
          break;
        }

        default:
          rawStatus = 'UNKNOWN';
      }
    }

    const sanitized = this.aiCommunication.mapBookingStatus(rawStatus);
    const message = this.aiCommunication.formatResponse(sanitized, language, options);
    return this.safetyLayer.filter(message, language);
  }

  async sendMessage(to: string, body: string): Promise<void> {
    if (!process.env.TWILIO_ACCOUNT_SID || !this.fromNumber) return;

    const recipient = to.startsWith('whatsapp:') ? to : `whatsapp:+${to}`;
    await retryWithBackoff(() =>
      this.twilioClient.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: recipient,
        body,
      }),
    );
  }

  private async findActiveAppointment(clientId: string, id?: string) {
    if (id) {
      return this.prisma.appointment.findFirst({
        where: { id, clientId, status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] } },
      });
    }
    return this.prisma.appointment.findFirst({
      where: { clientId, status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] } },
      orderBy: { startTime: 'asc' },
    });
  }
}
