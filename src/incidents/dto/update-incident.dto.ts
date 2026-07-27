import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  IncidentCategory,
  IncidentSeverity,
} from '../../generated/prisma/client';

export class UpdateIncidentDto {
  @ApiPropertyOptional({ example: '7c5c05c7-9303-4a7a-8a23-9fbb1a623b12' })
  @IsOptional()
  @IsUUID()
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

  @ApiPropertyOptional({
    enum: IncidentSeverity,
    example: IncidentSeverity.SEV2,
  })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({
    enum: IncidentCategory,
    example: IncidentCategory.SECURITY,
  })
  @IsOptional()
  @IsEnum(IncidentCategory)
  category?: IncidentCategory;

  @ApiPropertyOptional({
    example:
      'Multiple requests with valid credentials originated from an unusual network range.',
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

  @ApiPropertyOptional({ example: 'a9c721b4-73d0-4cf6-8f27-c558a69d7cb3' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
