import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { AiCommunicationModule } from '../ai-communication/ai-communication.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [AiCommunicationModule, AppointmentsModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
