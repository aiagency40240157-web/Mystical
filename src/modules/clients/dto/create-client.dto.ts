import { IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsIn(['RED', 'BLUE', 'YELLOW', 'NULL'])
  @IsOptional()
  groupColor?: string;

  @IsBoolean()
  @IsOptional()
  isKnownRelation?: boolean;

  @IsBoolean()
  @IsOptional()
  isVip?: boolean;
}
