import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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

  @ApiPropertyOptional({ example: 'a9c721b4-73d0-4cf6-8f27-c558a69d7cb3' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ example: '2026-07-27T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
