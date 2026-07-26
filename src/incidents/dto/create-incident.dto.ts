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
  @IsString()
  organizationId: string;

  @IsString()
  systemId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(140)
  title: string;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsEnum(IncidentCategory)
  category: IncidentCategory;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  summary: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  impact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rootCause?: string;

  @IsDateString()
  detectedAt: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
