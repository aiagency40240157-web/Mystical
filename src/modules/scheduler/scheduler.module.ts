import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { DailyReportService } from './daily-report.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AiCommunicationModule } from '../ai-communication/ai-communication.module';

@Module({
  imports: [WhatsAppModule, AiCommunicationModule],
  providers: [ReminderService, DailyReportService],
})
export class SchedulerModule {}
