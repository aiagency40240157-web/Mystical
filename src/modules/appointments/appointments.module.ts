import { Module } from '@nestjs/common';
import {
  AppointmentsController,
  AvailabilityController,
} from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrivacyModule } from '../privacy/privacy.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { PaymentModule } from '../payments/payment.module';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [PrivacyModule, WaitlistModule, PaymentModule, AuditModule, ClientsModule],
  controllers: [AppointmentsController, AvailabilityController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
