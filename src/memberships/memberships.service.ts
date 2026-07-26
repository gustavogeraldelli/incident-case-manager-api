import { Injectable } from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const roleRank: Record<MembershipRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  RESPONDER: 2,
  VIEWER: 1,
};

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  findForUserInOrganization(userId: string, organizationId: string) {
    return this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });
  }

  hasAtLeastRole(userRole: MembershipRole, minimumRole: MembershipRole) {
    return roleRank[userRole] >= roleRank[minimumRole];
  }
}
