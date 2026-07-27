import { Injectable, NotFoundException } from '@nestjs/common';
import { ExportJobStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const exportJobSelect = {
  id: true,
  reportId: true,
  status: true,
  result: true,
  error: true,
  createdAt: true,
  finishedAt: true,
};

@Injectable()
export class ExportJobsService {
  constructor(private readonly prisma: PrismaService) {}

  create(reportId: string) {
    return this.prisma.exportJob.create({
      data: {
        reportId,
      },
      select: exportJobSelect,
    });
  }

  markProcessing(id: string) {
    return this.prisma.exportJob.update({
      where: {
        id,
      },
      data: {
        status: ExportJobStatus.PROCESSING,
        error: null,
      },
      select: exportJobSelect,
    });
  }

  complete(id: string, result: string) {
    return this.prisma.exportJob.update({
      where: {
        id,
      },
      data: {
        status: ExportJobStatus.COMPLETED,
        result,
        error: null,
        finishedAt: new Date(),
      },
      select: exportJobSelect,
    });
  }

  fail(id: string, error: string) {
    return this.prisma.exportJob.update({
      where: {
        id,
      },
      data: {
        status: ExportJobStatus.FAILED,
        error,
        finishedAt: new Date(),
      },
      select: exportJobSelect,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const exportJob = await this.prisma.exportJob.findFirst({
      where: {
        id,
        report: {
          incident: {
            organization: {
              memberships: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
      select: {
        ...exportJobSelect,
        report: {
          select: {
            incident: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!exportJob) {
      throw new NotFoundException('Export job not found');
    }

    const { report: _report, ...response } = exportJob;
    return response;
  }
}
