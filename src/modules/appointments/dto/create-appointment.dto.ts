import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  clientId!: string;

  @IsISO8601()
  startTime!: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
