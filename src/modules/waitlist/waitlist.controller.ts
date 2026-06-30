import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
@Roles('MANAGER', 'AGENT', 'ASSISTANT')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  findAll() {
    return this.waitlistService.findAll();
  }
}
