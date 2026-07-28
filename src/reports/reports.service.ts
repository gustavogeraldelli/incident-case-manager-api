import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ExportJobsService } from '../export-jobs/export-jobs.service';
import { IncidentStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { EXPORT_REPORT_JOB, REPORT_EXPORT_QUEUE } from './report-export.queue';

const reportSelect = {
  id: true,
  incidentId: true,
  title: true,
  summary: true,
  timeline: true,
  impact: true,
  rootCause: true,
  resolution: true,
  lessonsLearned: true,
  preventiveActions: true,
  markdown: true,
  createdAt: true,
  updatedAt: true,
};

const incidentForReportSelect = {
  id: true,
  organizationId: true,
  systemId: true,
  title: true,
  severity: true,
  status: true,
  category: true,
  summary: true,
  impact: true,
  rootCause: true,
  detectedAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  system: {
    select: {
      name: true,
      type: true,
      environment: true,
      criticality: true,
      ownerTeam: true,
    },
  },
  evidences: {
    select: {
      type: true,
      content: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  actions: {
    select: {
      type: true,
      description: true,
      status: true,
      dueAt: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.IncidentSelect;

const auditLogForReportSelect = {
  action: true,
  before: true,
  after: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

type IncidentForReport = Prisma.IncidentGetPayload<{
  select: typeof incidentForReportSelect;
}> & {
  auditLogs: Prisma.AuditLogGetPayload<{
    select: typeof auditLogForReportSelect;
  }>[];
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportJobsService: ExportJobsService,
    @InjectQueue(REPORT_EXPORT_QUEUE)
    private readonly reportExportQueue: Queue,
  ) {}

  async createIncidentReport(
    userId: string,
    incidentId: string,
    dto: CreateIncidentReportDto,
  ) {
    const incident = await this.findIncidentForReport(userId, incidentId);

    if (!this.isReportableStatus(incident.status)) {
      throw new BadRequestException(
        'Incident report can only be generated for resolved, closed or false positive incidents',
      );
    }

    const existingReport = await this.prisma.incidentReport.findUnique({
      where: {
        incidentId: incident.id,
      },
      select: {
        id: true,
      },
    });

    if (existingReport) {
      throw new ConflictException('Incident report already exists');
    }

    const timeline = this.buildTimeline(incident);
    const resolution = this.buildResolution(incident);
    const markdown = this.buildMarkdown({
      incident,
      timeline,
      resolution,
      lessonsLearned: dto.lessonsLearned,
      preventiveActions: dto.preventiveActions,
    });

    return this.prisma.incidentReport.create({
      data: {
        incidentId: incident.id,
        title: incident.title,
        summary: incident.summary,
        timeline,
        impact: incident.impact,
        rootCause: incident.rootCause,
        resolution,
        lessonsLearned: dto.lessonsLearned,
        preventiveActions: dto.preventiveActions,
        markdown,
      },
      select: reportSelect,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const report = await this.prisma.incidentReport.findFirst({
      where: {
        id,
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
      select: {
        ...reportSelect,
        incident: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Incident report not found');
    }

    const { incident: _incident, ...response } = report;
    return response;
  }

  async findMarkdownForUser(userId: string, id: string) {
    const report = await this.findOneForUser(userId, id);

    return {
      title: report.title,
      markdown: report.markdown,
    };
  }

  async requestExport(userId: string, reportId: string) {
    await this.findOneForUser(userId, reportId);

    const exportJob = await this.exportJobsService.create(reportId);

    try {
      await this.reportExportQueue.add(
        EXPORT_REPORT_JOB,
        {
          exportJobId: exportJob.id,
          reportId,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      await this.exportJobsService.fail(exportJob.id, this.message(error));
      throw error;
    }

    return exportJob;
  }

  async getMarkdownForExport(reportId: string) {
    const report = await this.prisma.incidentReport.findUnique({
      where: {
        id: reportId,
      },
      select: {
        markdown: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Incident report not found');
    }

    return report.markdown;
  }

  private async findIncidentForReport(
    userId: string,
    incidentId: string,
  ): Promise<IncidentForReport> {
    const incident = await this.prisma.incident.findFirst({
      where: {
        id: incidentId,
        organization: {
          memberships: {
            some: {
              userId,
            },
          },
        },
      },
      select: incidentForReportSelect,
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'Incident',
        entityId: incident.id,
      },
      select: auditLogForReportSelect,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      ...incident,
      auditLogs,
    };
  }

  private buildTimeline(incident: IncidentForReport) {
    const lines = [
      `- Detected at: ${incident.detectedAt.toISOString()}`,
      `- Current status: ${incident.status}`,
    ];

    for (const auditLog of incident.auditLogs) {
      lines.push(
        `- ${auditLog.createdAt.toISOString()}: ${auditLog.action} ${this.formatJson(
          auditLog.before,
        )} -> ${this.formatJson(auditLog.after)}`,
      );
    }

    if (incident.resolvedAt) {
      lines.push(`- Resolved at: ${incident.resolvedAt.toISOString()}`);
    }

    return lines.join('\n');
  }

  private isReportableStatus(status: IncidentStatus) {
    return (
      status === IncidentStatus.RESOLVED ||
      status === IncidentStatus.CLOSED ||
      status === IncidentStatus.FALSE_POSITIVE
    );
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private buildResolution(incident: IncidentForReport) {
    const doneActions = incident.actions.filter(
      (action) => action.status === 'DONE',
    );

    if (!doneActions.length) {
      return undefined;
    }

    return doneActions
      .map((action) => `- [${action.type}] ${action.description}`)
      .join('\n');
  }

  buildMarkdown(input: {
    incident: IncidentForReport;
    timeline: string;
    resolution?: string;
    lessonsLearned?: string;
    preventiveActions?: string;
  }) {
    const { incident } = input;

    return [
      `# Incident Report: ${incident.title}`,
      '',
      '## Incident',
      `- Severity: ${incident.severity}`,
      `- Status: ${incident.status}`,
      `- Category: ${incident.category}`,
      `- Detected at: ${incident.detectedAt.toISOString()}`,
      `- Resolved at: ${incident.resolvedAt?.toISOString() ?? 'Not resolved'}`,
      '',
      '## System',
      `- Name: ${incident.system.name}`,
      `- Type: ${incident.system.type}`,
      `- Environment: ${incident.system.environment}`,
      `- Criticality: ${incident.system.criticality}`,
      `- Owner team: ${incident.system.ownerTeam ?? 'Not provided'}`,
      '',
      '## Summary',
      incident.summary,
      '',
      '## Impact',
      incident.impact ?? 'Not provided',
      '',
      '## Root Cause',
      incident.rootCause ?? 'Not provided',
      '',
      '## Timeline',
      input.timeline,
      '',
      '## Evidences',
      this.formatEvidences(incident.evidences),
      '',
      '## Response Actions',
      this.formatActions(incident.actions),
      '',
      '## Resolution',
      input.resolution ?? 'No completed response actions yet.',
      '',
      '## Lessons Learned',
      input.lessonsLearned ?? 'Not provided',
      '',
      '## Preventive Actions',
      input.preventiveActions ?? 'Not provided',
    ].join('\n');
  }

  private formatEvidences(evidences: IncidentForReport['evidences']) {
    if (!evidences.length) {
      return 'No evidences registered.';
    }

    return evidences
      .map(
        (evidence) =>
          `- [${evidence.type}] ${evidence.content} (${evidence.createdAt.toISOString()})`,
      )
      .join('\n');
  }

  private formatActions(actions: IncidentForReport['actions']) {
    if (!actions.length) {
      return 'No response actions registered.';
    }

    return actions
      .map(
        (action) =>
          `- [${action.status}] [${action.type}] ${action.description} ` +
          `(due: ${action.dueAt?.toISOString() ?? 'none'}, completed: ${
            action.completedAt?.toISOString() ?? 'not completed'
          })`,
      )
      .join('\n');
  }

  private formatJson(value: unknown) {
    return JSON.stringify(value ?? null);
  }
}
