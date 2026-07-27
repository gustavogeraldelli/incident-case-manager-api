import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ExportJobsService } from '../export-jobs/export-jobs.service';
import { EXPORT_REPORT_JOB, REPORT_EXPORT_QUEUE } from './report-export.queue';
import { ReportsService } from './reports.service';

type ExportReportJobData = {
  exportJobId: string;
  reportId: string;
};

@Processor(REPORT_EXPORT_QUEUE)
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportJobsService: ExportJobsService,
  ) {
    super();
  }

  async process(job: Job<ExportReportJobData>) {
    if (job.name !== EXPORT_REPORT_JOB) {
      return;
    }

    try {
      await this.exportJobsService.markProcessing(job.data.exportJobId);

      const markdown = await this.reportsService.getMarkdownForExport(
        job.data.reportId,
      );

      await this.exportJobsService.complete(job.data.exportJobId, markdown);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Report export job ${job.data.exportJobId} failed: ${message}`,
      );
      await this.exportJobsService.fail(job.data.exportJobId, message);
      throw error;
    }
  }
}
