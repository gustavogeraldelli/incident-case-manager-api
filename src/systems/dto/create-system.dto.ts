import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'Payments API', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: SystemType, example: SystemType.API })
  @IsEnum(SystemType)
  type: SystemType;

  @ApiProperty({ enum: Environment, example: Environment.PRODUCTION })
  @IsEnum(Environment)
  environment: Environment;

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
