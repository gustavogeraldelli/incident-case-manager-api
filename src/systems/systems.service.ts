import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, Prisma } from '../generated/prisma/client';
import { MembershipsService } from '../memberships/memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';

const systemSelect = {
  id: true,
  organizationId: true,
  name: true,
  type: true,
  environment: true,
  ownerTeam: true,
  description: true,
  criticality: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class SystemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipsService: MembershipsService,
  ) {}

  async create(organizationId: string, dto: CreateSystemDto) {
    try {
      return await this.prisma.system.create({
        data: {
          organizationId,
          ...dto,
        },
        select: systemSelect,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'System already exists for this organization and environment',
        );
      }

      throw error;
    }
  }

  findAllForOrganization(organizationId: string) {
    return this.prisma.system.findMany({
      where: {
        organizationId,
      },
      select: systemSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForUser(userId: string, id: string) {
    return this.findAccessibleSystem(userId, id, MembershipRole.VIEWER);
  }

  async updateForUser(userId: string, id: string, dto: UpdateSystemDto) {
    const system = await this.findAccessibleSystem(
      userId,
      id,
      MembershipRole.RESPONDER,
    );

    try {
      return await this.prisma.system.update({
        where: {
          id: system.id,
        },
        data: dto,
        select: systemSelect,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'System already exists for this organization and environment',
        );
      }

      throw error;
    }
  }

  async removeForUser(userId: string, id: string) {
    const system = await this.findAccessibleSystem(
      userId,
      id,
      MembershipRole.RESPONDER,
    );

    await this.prisma.system.delete({
      where: {
        id: system.id,
      },
    });
  }

  private async findAccessibleSystem(
    userId: string,
    id: string,
    minimumRole: MembershipRole,
  ) {
    const system = await this.prisma.system.findUnique({
      where: {
        id,
      },
      select: systemSelect,
    });

    if (!system) {
      throw new NotFoundException('System not found');
    }

    const membership = await this.membershipsService.findForUserInOrganization(
      userId,
      system.organizationId,
    );

    if (
      !membership ||
      !this.membershipsService.hasAtLeastRole(membership.role, minimumRole)
    ) {
      throw new ForbiddenException('System access denied');
    }

    return system;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
