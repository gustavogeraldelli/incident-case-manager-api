import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '../cache/redis.service';
import { dashboardSummaryCacheKey } from '../dashboard/dashboard-cache';
import { ActionStatus, MembershipRole } from '../generated/prisma/client';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResponseActionDto } from './dto/create-response-action.dto';
import { UpdateActionStatusDto } from './dto/update-action-status.dto';
import { UpdateResponseActionDto } from './dto/update-response-action.dto';

const responseActionSelect = {
  id: true,
  incidentId: true,
  type: true,
  description: true,
  status: true,
  assignedToId: true,
  createdById: true,
  dueAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class ResponseActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipsService: MembershipsService,
    private readonly redisService: RedisService,
  ) {}

  async findForIncident(userId: string, incidentId: string) {
    await this.findAccessibleIncident(
      userId,
      incidentId,
      MembershipRole.VIEWER,
    );

    return this.prisma.responseAction.findMany({
      where: {
        incidentId,
      },
      select: responseActionSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    userId: string,
    incidentId: string,
    dto: CreateResponseActionDto,
  ) {
    const incident = await this.findAccessibleIncident(
      userId,
      incidentId,
      MembershipRole.RESPONDER,
    );

    if (dto.assignedToId) {
      await this.ensureMembership(
        dto.assignedToId,
        incident.organizationId,
        MembershipRole.VIEWER,
      );
    }

    const action = await this.prisma.responseAction.create({
      data: {
        incidentId,
        type: dto.type,
        description: dto.description,
        assignedToId: dto.assignedToId,
        dueAt: dto.dueAt,
        createdById: userId,
      },
      select: responseActionSelect,
    });

    await this.invalidateDashboardSummary(incident.organizationId);

    return action;
  }

  async update(userId: string, id: string, dto: UpdateResponseActionDto) {
    const action = await this.findAccessibleAction(
      userId,
      id,
      MembershipRole.RESPONDER,
    );

    if (dto.assignedToId) {
      await this.ensureMembership(
        dto.assignedToId,
        action.incident.organizationId,
        MembershipRole.VIEWER,
      );
    }

    const updatedAction = await this.prisma.responseAction.update({
      where: {
        id: action.id,
      },
      data: dto,
      select: responseActionSelect,
    });

    await this.invalidateDashboardSummary(action.incident.organizationId);

    return updatedAction;
  }

  async updateStatus(userId: string, id: string, dto: UpdateActionStatusDto) {
    const action = await this.findAccessibleAction(
      userId,
      id,
      MembershipRole.RESPONDER,
    );

    const completedAt =
      dto.status === ActionStatus.DONE
        ? (dto.completedAt ?? new Date().toISOString())
        : null;

    const updatedAction = await this.prisma.responseAction.update({
      where: {
        id: action.id,
      },
      data: {
        status: dto.status,
        completedAt,
      },
      select: responseActionSelect,
    });

    await this.invalidateDashboardSummary(action.incident.organizationId);

    return updatedAction;
  }

  async remove(userId: string, id: string) {
    const action = await this.findAccessibleAction(
      userId,
      id,
      MembershipRole.RESPONDER,
    );

    await this.prisma.responseAction.delete({
      where: {
        id: action.id,
      },
    });

    await this.invalidateDashboardSummary(action.incident.organizationId);
  }

  private async findAccessibleIncident(
    userId: string,
    incidentId: string,
    minimumRole: MembershipRole,
  ) {
    const incident = await this.prisma.incident.findUnique({
      where: {
        id: incidentId,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.ensureMembership(userId, incident.organizationId, minimumRole);

    return incident;
  }

  private async findAccessibleAction(
    userId: string,
    id: string,
    minimumRole: MembershipRole,
  ) {
    const action = await this.prisma.responseAction.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        incident: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!action) {
      throw new NotFoundException('Response action not found');
    }

    await this.ensureMembership(
      userId,
      action.incident.organizationId,
      minimumRole,
    );

    return action;
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
      throw new ForbiddenException('Response action access denied');
    }
  }

  private invalidateDashboardSummary(organizationId: string) {
    return this.redisService.del(dashboardSummaryCacheKey(organizationId));
  }
}
