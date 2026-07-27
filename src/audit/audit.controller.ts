import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('audit')
@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('organizations/:organizationId/audit-logs')
  findForOrganization(
    @CurrentUser() user: JwtUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.auditService.findForOrganization(user.id, organizationId);
  }

  @Get('incidents/:id/audit-logs')
  findForIncident(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auditService.findForIncident(user.id, id);
  }
}
