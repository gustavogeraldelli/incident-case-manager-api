import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('organizations/:organizationId/audit-logs')
  findForOrganization(
    @CurrentUser() user: JwtUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.auditService.findForOrganization(user.id, organizationId);
  }

  @Get('incidents/:id/audit-logs')
  findForIncident(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.auditService.findForIncident(user.id, id);
  }
}
