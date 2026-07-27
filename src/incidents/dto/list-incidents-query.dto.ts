import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  IncidentSeverity,
  IncidentStatus,
} from '../../generated/prisma/client';

export class ListIncidentsQueryDto {
  @ApiPropertyOptional({ example: '3f7a95dd-69e5-4e6f-a9b9-b6d83f2f6d1a' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ example: '7c5c05c7-9303-4a7a-8a23-9fbb1a623b12' })
  @IsOptional()
  @IsUUID()
  systemId?: string;

  @ApiPropertyOptional({ enum: IncidentStatus, example: IncidentStatus.OPEN })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({
    enum: IncidentSeverity,
    example: IncidentSeverity.SEV2,
  })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;
}
