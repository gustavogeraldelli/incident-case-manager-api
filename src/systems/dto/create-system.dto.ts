import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  Criticality,
  Environment,
  SystemType,
} from '../../generated/prisma/client';

export class CreateSystemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEnum(SystemType)
  type: SystemType;

  @IsEnum(Environment)
  environment: Environment;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ownerTeam?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(Criticality)
  criticality?: Criticality;
}
