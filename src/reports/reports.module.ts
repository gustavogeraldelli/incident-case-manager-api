import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportJobsModule } from '../export-jobs/export-jobs.module';
import { REPORT_EXPORT_QUEUE } from './report-export.queue';
import { ReportsController } from './reports.controller';
import { ReportsProcessor } from './reports.processor';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    ExportJobsModule,
    BullModule.registerQueue({
      name: REPORT_EXPORT_QUEUE,
    }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor],
})
export class ReportsModule {}
