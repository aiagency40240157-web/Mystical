import { Controller, Get } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  findAll() {
    return this.waitlistService.findAll();
  }
}
