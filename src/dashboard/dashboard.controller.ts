import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrganizationRoleGuard } from '../common/guards/organization-role.guard';
import { MembershipRole } from '../generated/prisma/client';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('dashboard')
@Controller('organizations/:organizationId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @UseGuards(OrganizationRoleGuard)
  @Roles(MembershipRole.VIEWER)
  getSummary(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.dashboardService.getOrganizationSummary(organizationId);
  }
}
