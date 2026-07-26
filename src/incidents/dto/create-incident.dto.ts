import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateIncidentDto {
  @ApiProperty({ example: 'cm2org8cz0000xks7j5x8a1d2' })
  @IsString()
  organizationId: string;

  @ApiProperty({ example: 'cm2sys9da0001xks7l7z9b2e3' })
  @IsString()
  systemId: string;

  @ApiProperty({
    example: 'Unauthorized access detected on payments API',
    minLength: 3,
    maxLength: 140,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  title: string;

  @ApiProperty({ enum: IncidentSeverity, example: IncidentSeverity.SEV2 })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty({ enum: IncidentCategory, example: IncidentCategory.SECURITY })
  @IsEnum(IncidentCategory)
  category: IncidentCategory;

  @ApiProperty({
    example: 'Multiple requests with valid credentials originated from an unusual network range.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  summary: string;

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

  @ApiProperty({ example: '2026-07-26T13:30:00.000Z' })
  @IsDateString()
  detectedAt: string;

  @ApiPropertyOptional({ example: '2026-07-26T15:45:00.000Z' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @ApiPropertyOptional({ example: 'cm2usr7by0000xks7x9y8z1a2' })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
