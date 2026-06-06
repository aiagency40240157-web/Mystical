import { Module } from '@nestjs/common';
import { AiCommunicationModule } from '../ai-communication/ai-communication.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';

@Module({
  imports: [AiCommunicationModule, AppointmentsModule],
  controllers: [InstagramController],
  providers: [InstagramService],
  exports: [InstagramService],
})
export class InstagramModule {}
