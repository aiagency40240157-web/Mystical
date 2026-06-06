import { IsISO8601, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  clientId!: string;

  @IsISO8601()
  startTime!: string;
}
