import { IsISO8601, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, Max } from 'class-validator';

export class CreateIncomeDto {
  @IsNumber()
  @IsPositive()
  @Max(1_000_000)
  amount!: number;

  @IsString()
  @Length(1, 64)
  type!: string;

  @IsOptional()
  @IsString()
  @Length(1, 512)
  description?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsISO8601()
  recordedAt?: string;
}
