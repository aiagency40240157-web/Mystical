import { IsString, IsUUID } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsUUID()
  appointmentId!: string;

  @IsString()
  newStartTime!: string;
}
