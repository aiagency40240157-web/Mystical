import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(80)
  category!: string;

  @IsInt()
  @Min(0)
  durationMins!: number;

  // Price in cents. 0 means "ask at the office" (no fixed price).
  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
