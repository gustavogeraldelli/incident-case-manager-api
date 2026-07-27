import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateSystemDto {
  @ApiPropertyOptional({
    example: 'Payments API',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: SystemType, example: SystemType.API })
  @IsOptional()
  @IsEnum(SystemType)
  type?: SystemType;

  @ApiPropertyOptional({ enum: Environment, example: Environment.PRODUCTION })
  @IsOptional()
  @IsEnum(Environment)
  environment?: Environment;

  @ApiPropertyOptional({ example: 'platform-security', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ownerTeam?: string;

  @ApiPropertyOptional({
    example: 'Public API responsible for payment authorization callbacks.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: Criticality, example: Criticality.HIGH })
  @IsOptional()
  @IsEnum(Criticality)
  criticality?: Criticality;
}
