import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ActionType } from '../../generated/prisma/client';

export class UpdateResponseActionDto {
  @IsOptional()
  @IsEnum(ActionType)
  type?: ActionType;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
