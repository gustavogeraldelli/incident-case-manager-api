import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { EvidenceType } from '../../generated/prisma/client';

export class CreateEvidenceDto {
  @IsEnum(EvidenceType)
  type: EvidenceType;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  content: string;
}
