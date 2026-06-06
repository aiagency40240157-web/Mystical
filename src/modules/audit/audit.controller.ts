import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@Roles('MANAGER', 'ASSISTANT')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll() {
    return this.auditService.findAll();
  }
}
