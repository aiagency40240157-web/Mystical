import { IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

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

  @IsString()
  @IsOptional()
  knownRelationNote?: string;

  @IsBoolean()
  @IsOptional()
  isVip?: boolean;
}
