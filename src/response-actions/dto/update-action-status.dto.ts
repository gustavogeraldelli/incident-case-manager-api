import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ActionStatus } from '../../generated/prisma/client';

export class UpdateActionStatusDto {
  @IsEnum(ActionStatus)
  status: ActionStatus;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
