import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AICommunicationService } from '../ai-communication/ai-communication.service';
import { ResponseSafetyLayerService } from '../ai-communication/response-safety-layer.service';
import { IntentParserService } from '../ai-communication/intent-parser.service';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly accessToken: string;
  private readonly igBusinessId: string;

  // In-memory session: IG sender ID → verified phone number
  private readonly sessions = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentsService: AppointmentsService,
    private readonly aiCommunication: AICommunicationService,
    private readonly safetyLayer: ResponseSafetyLayerService,
    private readonly intentParser: IntentParserService,
  ) {
    this.accessToken = process.env.META_ACCESS_TOKEN ?? '';
    this.igBusinessId = process.env.META_INSTAGRAM_ID ?? '';
  }

  async processMessage(senderId: string, text: string): Promise<void> {
    const phone = this.sessions.get(senderId);

    if (!phone) {
      await this.handlePhoneVerification(senderId, text);
      return;
    }

    const client = await this.prisma.client.findFirst({ where: { phone } });
    if (!client) {
      this.sessions.delete(senderId);
      await this.sendMessage(senderId, 'No encontré tu perfil. Envía tu número de teléfono registrado.');
      return;
    }

    const intent = this.intentParser.parse(text);
    const language = (client.preferredLanguage as 'en' | 'es') ?? intent.language;
    let rawStatus = 'UNKNOWN';
    let options: string[] | undefined;

    switch (intent.type) {
      case 'BOOK': {
        if (!intent.requestedTime) {
          rawStatus = 'UNKNOWN';
        } else {
          const result = await this.appointmentsService.create({
            clientId: client.id,
            startTime: intent.requestedTime.toISOString(),
          });
          rawStatus = result.status;
          options = result.options;
        }
        break;
      }

      case 'CANCEL': {
        const appt = await this.findActiveAppointment(client.id, intent.appointmentId);
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
          const appt = await this.findActiveAppointment(client.id);
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
        const appt = await this.findActiveAppointment(client.id);
        rawStatus = appt ? appt.status : 'NOT_AVAILABLE';
        break;
      }

      default:
        rawStatus = 'UNKNOWN';
    }

    const sanitized = this.aiCommunication.mapBookingStatus(rawStatus);
    const message = this.aiCommunication.formatResponse(sanitized, language, options);
    const safe = this.safetyLayer.filter(message, language);
    await this.sendMessage(senderId, safe);
  }

  async sendMessage(recipientId: string, text: string): Promise<void> {
    if (!this.accessToken || !this.igBusinessId) {
      this.logger.debug(`[Instagram stub] → ${recipientId}: ${text}`);
      return;
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${this.igBusinessId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text },
          }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Instagram send failed: ${res.status} ${body}`);
      }
    } catch (err) {
      this.logger.error('Instagram send error', err);
    }
  }

  private async handlePhoneVerification(senderId: string, text: string): Promise<void> {
    const digits = text.replace(/\D/g, '');

    if (digits.length >= 7) {
      const client = await this.prisma.client.findFirst({
        where: { phone: { contains: digits.slice(-7) } },
      });

      if (client) {
        this.sessions.set(senderId, client.phone!);
        const greeting =
          client.preferredLanguage === 'es'
            ? `Hola ${client.firstName}! Ahora puedes escribir: *cita*, *cancelar*, *reagendar* o *estado*.`
            : `Hello ${client.firstName}! You can now type: *book*, *cancel*, *reschedule*, or *status*.`;
        await this.sendMessage(senderId, greeting);
      } else {
        await this.sendMessage(
          senderId,
          'No encontré ese número en nuestro sistema. Verifica e intenta de nuevo, o contáctanos directamente.',
        );
      }
    } else {
      await this.sendMessage(
        senderId,
        'Hola! Bienvenido a Mystical ✨\n\nPara ayudarte, necesito tu número de teléfono registrado en el salón:',
      );
    }
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
