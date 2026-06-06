import { Module } from '@nestjs/common';
import { PrivacyRuleService } from './privacy-rule.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [PrivacyRuleService],
  exports: [PrivacyRuleService],
})
export class PrivacyModule {}
