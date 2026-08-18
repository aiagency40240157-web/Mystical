import { IsOptional, IsString } from 'class-validator';

export class UpdateAppointmentDto {
  // Reassign the service on an existing appointment, or clear it (send null).
  @IsOptional()
  @IsString()
  serviceId?: string | null;
}
