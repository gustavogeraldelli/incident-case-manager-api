import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ExportJobsService } from '../export-jobs/export-jobs.service';
import { EXPORT_REPORT_JOB } from './report-export.queue';
import { ReportsProcessor } from './reports.processor';
import { ReportsService } from './reports.service';

describe('ReportsProcessor', () => {
  const reportsService = {
    getMarkdownForExport: jest.fn(),
  } as unknown as jest.Mocked<Pick<ReportsService, 'getMarkdownForExport'>>;

  const exportJobsService = {
    markProcessing: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<ExportJobsService, 'markProcessing' | 'complete' | 'fail'>
  >;

  let processor: ReportsProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    processor = new ReportsProcessor(
      reportsService as unknown as ReportsService,
      exportJobsService as unknown as ExportJobsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks export jobs as completed with generated markdown', async () => {
    reportsService.getMarkdownForExport.mockResolvedValue('# Incident Report');

    await processor.process(
      job({
        name: EXPORT_REPORT_JOB,
        data: {
          exportJobId: 'export-job-1',
          reportId: 'report-1',
        },
      }),
    );

    expect(exportJobsService.markProcessing).toHaveBeenCalledWith(
      'export-job-1',
    );
    expect(reportsService.getMarkdownForExport).toHaveBeenCalledWith(
      'report-1',
    );
    expect(exportJobsService.complete).toHaveBeenCalledWith(
      'export-job-1',
      '# Incident Report',
    );
    expect(exportJobsService.fail).not.toHaveBeenCalled();
  });

  it('marks export jobs as failed when processing throws', async () => {
    reportsService.getMarkdownForExport.mockRejectedValue(
      new Error('Report not found'),
    );

    await expect(
      processor.process(
        job({
          name: EXPORT_REPORT_JOB,
          data: {
            exportJobId: 'export-job-1',
            reportId: 'missing-report',
          },
        }),
      ),
    ).rejects.toThrow('Report not found');

    expect(exportJobsService.markProcessing).toHaveBeenCalledWith(
      'export-job-1',
    );
    expect(exportJobsService.complete).not.toHaveBeenCalled();
    expect(exportJobsService.fail).toHaveBeenCalledWith(
      'export-job-1',
      'Report not found',
    );
  });

  it('ignores jobs with a different name', async () => {
    await processor.process(
      job({
        name: 'other-job',
        data: {
          exportJobId: 'export-job-1',
          reportId: 'report-1',
        },
      }),
    );

    expect(exportJobsService.markProcessing).not.toHaveBeenCalled();
    expect(reportsService.getMarkdownForExport).not.toHaveBeenCalled();
    expect(exportJobsService.complete).not.toHaveBeenCalled();
  });

  function job(input: {
    name: string;
    data: {
      exportJobId: string;
      reportId: string;
    };
  }) {
    return input as Job<{
      exportJobId: string;
      reportId: string;
    }>;
  }
});
