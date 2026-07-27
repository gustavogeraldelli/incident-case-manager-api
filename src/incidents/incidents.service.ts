import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../cache/redis.service';
import { dashboardSummaryCacheKey } from '../dashboard/dashboard-cache';
import {
  IncidentStatus,
  MembershipRole,
  Prisma,
} from '../generated/prisma/client';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ListIncidentsQueryDto } from './dto/list-incidents-query.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

const incidentSelect = {
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
  createdById: true,
  assignedToId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipsService: MembershipsService,
    private readonly auditService: AuditService,
    private readonly redisService: RedisService,
  ) {}

  async create(userId: string, dto: CreateIncidentDto) {
    await this.ensureMembership(
      userId,
      dto.organizationId,
      MembershipRole.RESPONDER,
    );
    await this.ensureSystemBelongsToOrganization(
      dto.systemId,
      dto.organizationId,
    );

    if (dto.assignedToId) {
      await this.ensureMembership(
        dto.assignedToId,
        dto.organizationId,
        MembershipRole.VIEWER,
      );
    }

    const incident = await this.prisma.incident.create({
      data: {
        organizationId: dto.organizationId,
        systemId: dto.systemId,
        title: dto.title,
        severity: dto.severity,
        category: dto.category,
        summary: dto.summary,
        impact: dto.impact,
        rootCause: dto.rootCause,
        detectedAt: dto.detectedAt,
        resolvedAt: dto.resolvedAt,
        createdById: userId,
        assignedToId: dto.assignedToId,
      },
      select: incidentSelect,
    });

    await this.invalidateDashboardSummary(dto.organizationId);

    return incident;
  }

  findAllForUser(userId: string, query: ListIncidentsQueryDto) {
    const where: Prisma.IncidentWhereInput = {
      organization: {
        memberships: {
          some: {
            userId,
          },
        },
      },
      organizationId: query.organizationId,
      systemId: query.systemId,
      status: query.status,
      severity: query.severity,
    };

    return this.prisma.incident.findMany({
      where,
      select: incidentSelect,
      orderBy: {
        detectedAt: 'desc',
      },
    });
  }

  async findOneForUser(userId: string, id: string) {
    return this.findAccessibleIncident(userId, id, MembershipRole.VIEWER);
  }

  async updateForUser(userId: string, id: string, dto: UpdateIncidentDto) {
    const incident = await this.findAccessibleIncident(
      userId,
      id,
      MembershipRole.RESPONDER,
    );

    if (dto.systemId) {
      await this.ensureSystemBelongsToOrganization(
        dto.systemId,
        incident.organizationId,
      );
    }

    if (dto.assignedToId) {
      await this.ensureMembership(
        dto.assignedToId,
        incident.organizationId,
        MembershipRole.VIEWER,
      );
    }

    const updatedIncident = await this.prisma.incident.update({
      where: {
        id: incident.id,
      },
      data: dto,
      select: incidentSelect,
    });

    await this.invalidateDashboardSummary(incident.organizationId);

    return updatedIncident;
  }

  async updateStatusForUser(
    userId: string,
    id: string,
    dto: UpdateIncidentStatusDto,
  ) {
    const incident = await this.findAccessibleIncident(
      userId,
      id,
      MembershipRole.RESPONDER,
    );

    const resolvedAt = this.isResolvedStatus(dto.status)
      ? (dto.resolvedAt ?? new Date().toISOString())
      : null;

    const updatedIncident = await this.prisma.incident.update({
      where: {
        id: incident.id,
      },
      data: {
        status: dto.status,
        resolvedAt,
      },
      select: incidentSelect,
    });

    await this.auditService.record({
      organizationId: incident.organizationId,
      actorId: userId,
      entityType: 'Incident',
      entityId: incident.id,
      action: 'incident.status_changed',
      before: {
        status: incident.status,
        resolvedAt: incident.resolvedAt?.toISOString() ?? null,
      },
      after: {
        status: updatedIncident.status,
        resolvedAt: updatedIncident.resolvedAt?.toISOString() ?? null,
      },
    });

    await this.invalidateDashboardSummary(incident.organizationId);

    return updatedIncident;
  }

  private async findAccessibleIncident(
    userId: string,
    id: string,
    minimumRole: MembershipRole,
  ) {
    const incident = await this.prisma.incident.findUnique({
      where: {
        id,
      },
      select: incidentSelect,
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.ensureMembership(userId, incident.organizationId, minimumRole);

    return incident;
  }

  private async ensureMembership(
    userId: string,
    organizationId: string,
    minimumRole: MembershipRole,
  ) {
    const membership = await this.membershipsService.findForUserInOrganization(
      userId,
      organizationId,
    );

    if (
      !membership ||
      !this.membershipsService.hasAtLeastRole(membership.role, minimumRole)
    ) {
      throw new ForbiddenException('Incident access denied');
    }
  }

  private async ensureSystemBelongsToOrganization(
    systemId: string,
    organizationId: string,
  ) {
    const system = await this.prisma.system.findFirst({
      where: {
        id: systemId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!system) {
      throw new BadRequestException('System does not belong to organization');
    }
  }

  private isResolvedStatus(status: IncidentStatus) {
    return (
      status === IncidentStatus.RESOLVED ||
      status === IncidentStatus.CLOSED ||
      status === IncidentStatus.FALSE_POSITIVE
    );
  }

  private invalidateDashboardSummary(organizationId: string) {
    return this.redisService.del(dashboardSummaryCacheKey(organizationId));
  }
}
