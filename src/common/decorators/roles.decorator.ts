import { SetMetadata } from '@nestjs/common';
import { MembershipRole } from '../../generated/prisma/client';

export const ORGANIZATION_ROLES_KEY = 'organizationRoles';

export const Roles = (minimumRole: MembershipRole) =>
  SetMetadata(ORGANIZATION_ROLES_KEY, minimumRole);
