import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@Roles('MANAGER', 'ASSISTANT')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(@Query('date') date: string) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Invalid request');
    }
    return this.analyticsService.getSummary(date);
  }

  @Get('waitlist-pressure')
  getWaitlistPressure() {
    return this.analyticsService.getWaitlistPressure();
  }
}
