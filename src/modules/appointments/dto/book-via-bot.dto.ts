import { IsISO8601, IsOptional, IsString, Length, Matches } from 'class-validator';

export class BookViaBotDto {
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be a valid E.164 number' })
  phone!: string;

  @IsString()
  @Length(1, 64)
  firstName!: string;

  @IsString()
  @Length(1, 64)
  lastName!: string;

  @IsISO8601()
  startTime!: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  serviceName?: string;
}
