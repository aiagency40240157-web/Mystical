import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { AuditModule } from '../audit/audit.module';
import { WaitlistModule } from '../waitlist/waitlist.module';

@Module({
  imports: [AuditModule, WaitlistModule],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
