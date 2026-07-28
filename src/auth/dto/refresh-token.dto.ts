import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'f1197ecdfad168e8b6f0d60c3f4d7a4e...',
    minLength: 32,
  })
  @IsString()
  @MinLength(32)
  refreshToken: string;
}
