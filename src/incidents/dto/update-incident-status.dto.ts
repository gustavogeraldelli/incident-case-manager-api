import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { IncidentStatus } from '../../generated/prisma/client';

export class UpdateIncidentStatusDto {
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;
}
