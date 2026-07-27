import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportJobsService } from './export-jobs.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('export-jobs')
@Controller('export-jobs')
export class ExportJobsController {
  constructor(private readonly exportJobsService: ExportJobsService) {}

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.exportJobsService.findOneForUser(user.id, id);
  }
}
