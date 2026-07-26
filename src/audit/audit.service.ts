import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, Prisma } from '../generated/prisma/client';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';

type RecordAuditLogInput = {
  organizationId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

const auditLogSelect = {
  id: true,
  organizationId: true,
  actorId: true,
  entityType: true,
  entityId: true,
  action: true,
  before: true,
  after: true,
  createdAt: true,
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipsService: MembershipsService,
  ) {}

  record(input: RecordAuditLogInput) {
    return this.prisma.auditLog.create({
      data: input,
      select: auditLogSelect,
    });
  }

  async findForOrganization(userId: string, organizationId: string) {
    await this.ensureMembership(userId, organizationId);

    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
      },
      select: auditLogSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findForIncident(userId: string, incidentId: string) {
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

    await this.ensureMembership(userId, incident.organizationId);

    return this.prisma.auditLog.findMany({
      where: {
        entityType: 'Incident',
        entityId: incident.id,
      },
      select: auditLogSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
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
      throw new ForbiddenException('Audit log access denied');
    }
  }
}
