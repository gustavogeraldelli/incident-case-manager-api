import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncidentReportDto {
  @ApiPropertyOptional({
    example:
      'The alert threshold worked, but escalation ownership was unclear.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lessonsLearned?: string;

  @ApiPropertyOptional({
    example:
      'Add a quarterly token rotation drill and document the escalation path.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  preventiveActions?: string;
}
