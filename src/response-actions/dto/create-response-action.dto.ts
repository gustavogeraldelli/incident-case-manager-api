import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ActionType } from '../../generated/prisma/client';

export class CreateResponseActionDto {
  @IsEnum(ActionType)
  type: ActionType;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
