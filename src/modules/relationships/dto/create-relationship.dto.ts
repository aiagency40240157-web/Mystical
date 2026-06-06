import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class CreateRelationshipDto {
  @IsUUID()
  clientAId!: string;

  @IsUUID()
  clientBId!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}
