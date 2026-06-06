import { Module } from '@nestjs/common';
import { RetentionService } from './retention.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [RetentionService],
})
export class RetentionModule {}
