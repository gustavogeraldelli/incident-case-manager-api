import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  IncidentSeverity,
  IncidentStatus,
} from '../../generated/prisma/client';

export class ListIncidentsQueryDto {
  @ApiPropertyOptional({ example: 'cm2org8cz0000xks7j5x8a1d2' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ example: 'cm2sys9da0001xks7l7z9b2e3' })
  @IsOptional()
  @IsString()
  systemId?: string;

  @ApiPropertyOptional({ enum: IncidentStatus, example: IncidentStatus.OPEN })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ enum: IncidentSeverity, example: IncidentSeverity.SEV2 })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;
}
