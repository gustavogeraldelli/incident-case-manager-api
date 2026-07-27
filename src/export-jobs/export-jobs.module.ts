import { Module } from '@nestjs/common';
import { ExportJobsController } from './export-jobs.controller';
import { ExportJobsService } from './export-jobs.service';

@Module({
  controllers: [ExportJobsController],
  providers: [ExportJobsService],
  exports: [ExportJobsService],
})
export class ExportJobsModule {}
