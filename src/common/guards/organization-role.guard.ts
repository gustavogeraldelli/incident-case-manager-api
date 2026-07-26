import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ORGANIZATION_ROLES_KEY } from '../decorators/roles.decorator';
import type { JwtUser } from '../../auth/types/jwt-user.type';
import { MembershipRole } from '../../generated/prisma/client';
import { MembershipsService } from '../../memberships/memberships.service';

type OrganizationRequest = Request & {
  user?: JwtUser;
  params: {
    id?: string;
    organizationId?: string;
  };
  body?: {
    organizationId?: string;
  };
  query: {
    organizationId?: string;
  };
};

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly membershipsService: MembershipsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minimumRole = this.reflector.getAllAndOverride<MembershipRole>(
      ORGANIZATION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!minimumRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest<OrganizationRequest>();
    const user = request.user;
    const organizationId = this.getOrganizationId(request);

    if (!user || !organizationId) {
      throw new ForbiddenException('Organization access denied');
    }

    const membership = await this.membershipsService.findForUserInOrganization(
      user.id,
      organizationId,
    );

    if (
      !membership ||
      !this.membershipsService.hasAtLeastRole(membership.role, minimumRole)
    ) {
      throw new ForbiddenException('Organization access denied');
    }

    return true;
  }

  private getOrganizationId(request: OrganizationRequest): string | undefined {
    return (
      request.params.organizationId ??
      request.params.id ??
      request.body?.organizationId ??
      request.query.organizationId
    );
  }
}
