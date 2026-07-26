import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { IncidentStatus } from '../../generated/prisma/client';

export class UpdateIncidentStatusDto {
  @ApiProperty({ enum: IncidentStatus, example: IncidentStatus.RESOLVED })
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @ApiPropertyOptional({ example: '2026-07-26T15:45:00.000Z' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;
}
