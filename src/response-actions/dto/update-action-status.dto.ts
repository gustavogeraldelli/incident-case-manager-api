import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ActionStatus } from '../../generated/prisma/client';

export class UpdateActionStatusDto {
  @ApiProperty({ enum: ActionStatus, example: ActionStatus.DONE })
  @IsEnum(ActionStatus)
  status: ActionStatus;

  @ApiPropertyOptional({ example: '2026-07-26T16:20:00.000Z' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
