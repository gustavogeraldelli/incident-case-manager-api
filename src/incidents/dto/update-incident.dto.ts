import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  IncidentCategory,
  IncidentSeverity,
} from '../../generated/prisma/client';

export class UpdateIncidentDto {
  @ApiPropertyOptional({ example: 'cm2sys9da0001xks7l7z9b2e3' })
  @IsOptional()
  @IsString()
  systemId?: string;

  @ApiPropertyOptional({
    example: 'Unauthorized access detected on payments API',
    minLength: 3,
    maxLength: 140,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  title?: string;

  @ApiPropertyOptional({ enum: IncidentSeverity, example: IncidentSeverity.SEV2 })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ enum: IncidentCategory, example: IncidentCategory.SECURITY })
  @IsOptional()
  @IsEnum(IncidentCategory)
  category?: IncidentCategory;

  @ApiPropertyOptional({
    example: 'Multiple requests with valid credentials originated from an unusual network range.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({
    example: 'Potential exposure of customer payment metadata.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  impact?: string;

  @ApiPropertyOptional({
    example: 'Compromised service token used outside the expected network.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rootCause?: string;

  @ApiPropertyOptional({ example: '2026-07-26T13:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  detectedAt?: string;

  @ApiPropertyOptional({ example: '2026-07-26T15:45:00.000Z' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @ApiPropertyOptional({ example: 'cm2usr7by0000xks7x9y8z1a2' })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
