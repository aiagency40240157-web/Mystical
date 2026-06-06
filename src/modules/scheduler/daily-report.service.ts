import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ResponseSafetyLayerService } from '../ai-communication/response-safety-layer.service';
import { BUSINESS_TZ, pacificDateString, pacificDayBounds } from '../../common/utils/timezone.util';

@Injectable()
export class DailyReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly safetyLayer: ResponseSafetyLayerService,
  ) {}

  @Cron('0 0 20 * * *', { timeZone: BUSINESS_TZ })
  async sendDailyReport(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    const date = pacificDateString(new Date());
    const { start: today, end: tomorrow } = pacificDayBounds(date);

    const [total, cancelled, noShows, paidCount] = await Promise.all([
      this.prisma.appointment.count({
        where: { startTime: { gte: today, lt: tomorrow } },
      }),
      this.prisma.appointment.count({
        where: { startTime: { gte: today, lt: tomorrow }, status: 'CANCELLED' },
      }),
      this.prisma.appointment.count({
        where: { startTime: { gte: today, lt: tomorrow }, status: 'NO_SHOW' },
      }),
      this.prisma.payment.count({
        where: { createdAt: { gte: today, lt: tomorrow }, status: 'SUCCESS' },
      }),
    ]);

    const revenue = (paidCount * 20.91).toFixed(2);

    const report =
      `Daily Report ${date}: ${total} appointments total, ` +
      `${cancelled} cancellations, ${noShows} no-shows. ` +
      `Revenue: $${revenue} USD.`;

    const safeReport = this.safetyLayer.filter(report, 'en');

    const targets = [
      process.env.ADMIN_PHONE,
      process.env.ASSISTANT_PHONE,
    ].filter(Boolean) as string[];

    for (const phone of targets) {
      await this.whatsapp.sendMessage(phone, safeReport);
    }
  }
}
