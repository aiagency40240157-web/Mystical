import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Post('book-via-bot')
  bookViaBot(
    @Body()
    body: { phone: string; firstName: string; lastName: string; startTime: string; serviceName?: string },
  ) {
    return this.appointmentsService.bookViaBot(
      body.phone,
      body.firstName,
      body.lastName,
      body.startTime,
      body.serviceName,
    );
  }

  @Get('availability')
  getAvailability(@Query('date') date: string, @Query('clientId') clientId?: string) {
    return this.appointmentsService.getAvailability(date, clientId);
  }

  @Get()
  findAll() {
    return this.appointmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Put('reschedule')
  reschedule(@Body() dto: RescheduleAppointmentDto) {
    return this.appointmentsService.reschedule(dto);
  }

  @Post(':id/reschedule')
  rescheduleById(@Param('id') id: string, @Body() body: { newStartTime: string }) {
    return this.appointmentsService.reschedule({ appointmentId: id, newStartTime: body.newStartTime });
  }

  @Post(':id/cancel')
  cancelById(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @Post(':id/no-show')
  markNoShow(@Param('id') id: string) {
    return this.appointmentsService.markNoShow(id);
  }
}

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  getAvailability(@Query('date') date: string) {
    return this.appointmentsService.getAvailability(date);
  }
}
