import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Roles, Public } from '../../common/decorators/roles.decorator';
import { AppointmentsService } from './appointments.service';
import { BookViaBotDto } from './dto/book-via-bot.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('MANAGER', 'AGENT', 'ASSISTANT')
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Post('book-via-bot')
  @Roles('SYSTEM')
  bookViaBot(@Body() dto: BookViaBotDto) {
    return this.appointmentsService.bookViaBot(
      dto.phone,
      dto.firstName,
      dto.lastName,
      dto.startTime,
      dto.serviceName,
    );
  }

  @Get('pending-reminders')
  @Roles('SYSTEM')
  getPendingReminders(@Query('window') window: '24h' | '5h') {
    return this.appointmentsService.getPendingReminders(window ?? '24h');
  }

  @Patch(':id/reminder-sent')
  @Roles('SYSTEM')
  markReminderSent(@Param('id') id: string, @Body() body: { window: '24h' | '5h' }) {
    return this.appointmentsService.markReminderSent(id, body.window ?? '24h');
  }

  @Get('availability')
  @Public()
  getAvailability(@Query('date') date: string, @Query('clientId') clientId?: string) {
    return this.appointmentsService.getAvailability(date, clientId);
  }

  @Get()
  @Roles('MANAGER', 'AGENT', 'ASSISTANT')
  findAll() {
    return this.appointmentsService.findAll();
  }

  @Get(':id')
  @Roles('MANAGER', 'AGENT', 'ASSISTANT', 'SYSTEM')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Put('reschedule')
  @Roles('MANAGER', 'AGENT', 'ASSISTANT')
  reschedule(@Body() dto: RescheduleAppointmentDto) {
    return this.appointmentsService.reschedule(dto);
  }

  @Post(':id/reschedule')
  @Roles('MANAGER', 'AGENT', 'ASSISTANT', 'SYSTEM')
  rescheduleById(@Param('id') id: string, @Body() body: { newStartTime: string }) {
    return this.appointmentsService.reschedule({ appointmentId: id, newStartTime: body.newStartTime });
  }

  @Post(':id/cancel')
  @Roles('MANAGER', 'AGENT', 'ASSISTANT', 'SYSTEM')
  cancelById(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @Delete(':id')
  @Roles('MANAGER', 'AGENT')
  cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @Post(':id/no-show')
  @Roles('MANAGER', 'AGENT')
  markNoShow(@Param('id') id: string) {
    return this.appointmentsService.markNoShow(id);
  }
}

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Public()
  getAvailability(@Query('date') date: string) {
    return this.appointmentsService.getAvailability(date);
  }
}
