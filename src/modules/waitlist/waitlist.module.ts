import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { AuditModule } from '../audit/audit.module';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

@Module({
  imports: [DatabaseModule, PrivacyModule, AuditModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
