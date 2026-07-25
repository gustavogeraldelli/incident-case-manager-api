import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

const organizationSelect = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = dto.slug ?? this.slugify(dto.name);

    if (!slug) {
      throw new BadRequestException(
        'Organization slug must contain at least one alphanumeric character',
      );
    }

    const existingOrganization = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingOrganization) {
      throw new ConflictException('Organization slug is already in use');
    }

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
        },
        select: organizationSelect,
      });

      await tx.membership.create({
        data: {
          userId,
          organizationId: organization.id,
          role: MembershipRole.OWNER,
        },
      });

      return organization;
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        memberships: {
          some: {
            userId,
          },
        },
      },
      select: {
        ...organizationSelect,
        memberships: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id,
        memberships: {
          some: {
            userId,
          },
        },
      },
      select: {
        ...organizationSelect,
        memberships: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
