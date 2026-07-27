import { Injectable } from '@nestjs/common';
import { RedisService } from '../cache/redis.service';
import {
  ActionStatus,
  IncidentSeverity,
  IncidentStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DASHBOARD_SUMMARY_TTL_SECONDS,
  dashboardSummaryCacheKey,
} from './dashboard-cache';

type DashboardSummary = {
  systems: number;
  openIncidents: number;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  incidentsByStatus: Record<IncidentStatus, number>;
  pendingActions: number;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getOrganizationSummary(organizationId: string) {
    const cacheKey = dashboardSummaryCacheKey(organizationId);
    const cachedSummary = await this.redisService.get(cacheKey);

    if (cachedSummary) {
      return JSON.parse(cachedSummary) as DashboardSummary;
    }

    const summary = await this.calculateOrganizationSummary(organizationId);

    await this.redisService.setJson(
      cacheKey,
      summary,
      DASHBOARD_SUMMARY_TTL_SECONDS,
    );

    return summary;
  }

  private async calculateOrganizationSummary(
    organizationId: string,
  ): Promise<DashboardSummary> {
    const [
      systems,
      openIncidents,
      incidentsBySeverity,
      incidentsByStatus,
      pendingActions,
    ] = await Promise.all([
      this.prisma.system.count({
        where: {
          organizationId,
        },
      }),
      this.prisma.incident.count({
        where: {
          organizationId,
          status: IncidentStatus.OPEN,
        },
      }),
      this.prisma.incident.groupBy({
        by: ['severity'],
        where: {
          organizationId,
        },
        _count: {
          severity: true,
        },
      }),
      this.prisma.incident.groupBy({
        by: ['status'],
        where: {
          organizationId,
        },
        _count: {
          status: true,
        },
      }),
      this.prisma.responseAction.count({
        where: {
          status: {
            in: [ActionStatus.TODO, ActionStatus.IN_PROGRESS],
          },
          incident: {
            organizationId,
          },
        },
      }),
    ]);

    return {
      systems,
      openIncidents,
      incidentsBySeverity: this.toSeverityCounts(incidentsBySeverity),
      incidentsByStatus: this.toStatusCounts(incidentsByStatus),
      pendingActions,
    };
  }

  private toSeverityCounts(
    rows: Array<{
      severity: IncidentSeverity;
      _count: {
        severity: number;
      };
    }>,
  ) {
    const counts = {
      [IncidentSeverity.SEV1]: 0,
      [IncidentSeverity.SEV2]: 0,
      [IncidentSeverity.SEV3]: 0,
      [IncidentSeverity.SEV4]: 0,
    };

    for (const row of rows) {
      counts[row.severity] = row._count.severity;
    }

    return counts;
  }

  private toStatusCounts(
    rows: Array<{
      status: IncidentStatus;
      _count: {
        status: number;
      };
    }>,
  ) {
    const counts = {
      [IncidentStatus.OPEN]: 0,
      [IncidentStatus.INVESTIGATING]: 0,
      [IncidentStatus.CONTAINED]: 0,
      [IncidentStatus.RESOLVED]: 0,
      [IncidentStatus.CLOSED]: 0,
      [IncidentStatus.FALSE_POSITIVE]: 0,
    };

    for (const row of rows) {
      counts[row.status] = row._count.status;
    }

    return counts;
  }
}
