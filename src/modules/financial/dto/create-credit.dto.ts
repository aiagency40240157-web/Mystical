import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, Max } from 'class-validator';

export class CreateCreditDto {
  @IsUUID()
  clientId!: string;

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
}
