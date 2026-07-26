import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncidentReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lessonsLearned?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  preventiveActions?: string;
}
