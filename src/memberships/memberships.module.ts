import { Module } from '@nestjs/common';
import { OrganizationRoleGuard } from '../common/guards/organization-role.guard';
import { MembershipsService } from './memberships.service';

@Module({
  providers: [MembershipsService, OrganizationRoleGuard],
  exports: [MembershipsService, OrganizationRoleGuard],
})
export class MembershipsModule {}
