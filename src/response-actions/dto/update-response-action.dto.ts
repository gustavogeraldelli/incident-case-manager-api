import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ enum: ActionType, example: ActionType.CONTAINMENT })
  @IsOptional()
  @IsEnum(ActionType)
  type?: ActionType;

  @ApiPropertyOptional({
    example: 'Rotate the compromised service token and revoke active sessions.',
    minLength: 5,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'cm2usr7by0000xks7x9y8z1a2' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ example: '2026-07-27T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
