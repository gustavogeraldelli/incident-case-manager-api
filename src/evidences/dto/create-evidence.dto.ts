import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { EvidenceType } from '../../generated/prisma/client';

export class CreateEvidenceDto {
  @ApiProperty({ enum: EvidenceType, example: EvidenceType.LOG })
  @IsEnum(EvidenceType)
  type: EvidenceType;

  @ApiProperty({
    example:
      'Auth service log entries showing successful token usage from an unexpected IP range.',
    minLength: 3,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  content: string;
}
