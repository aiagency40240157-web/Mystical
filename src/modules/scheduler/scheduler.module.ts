import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { DailyReportService } from './daily-report.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AiCommunicationModule } from '../ai-communication/ai-communication.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [WhatsAppModule, AiCommunicationModule, DatabaseModule],
  providers: [ReminderService, DailyReportService],
})
export class SchedulerModule {}
