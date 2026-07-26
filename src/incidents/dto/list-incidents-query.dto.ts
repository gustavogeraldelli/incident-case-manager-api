import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  IncidentSeverity,
  IncidentStatus,
} from '../../generated/prisma/client';

export class ListIncidentsQueryDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  systemId?: string;

  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;
}
