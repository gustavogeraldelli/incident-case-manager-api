import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExportJobStatus, MembershipRole } from '../generated/prisma/client';
import { MembershipsService } from '../memberships/memberships.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipsService: MembershipsService,
  ) {}

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
    const exportJob = await this.prisma.exportJob.findUnique({
      where: {
        id,
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

    await this.ensureMembership(
      userId,
      exportJob.report.incident.organizationId,
    );

    const { report: _report, ...response } = exportJob;
    return response;
  }

  private async ensureMembership(userId: string, organizationId: string) {
    const membership = await this.membershipsService.findForUserInOrganization(
      userId,
      organizationId,
    );

    if (
      !membership ||
      !this.membershipsService.hasAtLeastRole(
        membership.role,
        MembershipRole.VIEWER,
      )
    ) {
      throw new ForbiddenException('Export job access denied');
    }
  }
}
