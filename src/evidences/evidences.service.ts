import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/client';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';

const evidenceSelect = {
  id: true,
  incidentId: true,
  type: true,
  content: true,
  createdById: true,
  createdAt: true,
};

@Injectable()
export class EvidencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipsService: MembershipsService,
  ) {}

  async findForIncident(userId: string, incidentId: string) {
    await this.findAccessibleIncident(userId, incidentId, MembershipRole.VIEWER);

    return this.prisma.evidence.findMany({
      where: {
        incidentId,
      },
      select: evidenceSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(userId: string, incidentId: string, dto: CreateEvidenceDto) {
    await this.findAccessibleIncident(userId, incidentId, MembershipRole.RESPONDER);

    return this.prisma.evidence.create({
      data: {
        incidentId,
        type: dto.type,
        content: dto.content,
        createdById: userId,
      },
      select: evidenceSelect,
    });
  }

  async remove(userId: string, id: string) {
    const evidence = await this.prisma.evidence.findUnique({
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

    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    await this.ensureMembership(
      userId,
      evidence.incident.organizationId,
      MembershipRole.RESPONDER,
    );

    await this.prisma.evidence.delete({
      where: {
        id: evidence.id,
      },
    });
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
      throw new ForbiddenException('Evidence access denied');
    }
  }
}
