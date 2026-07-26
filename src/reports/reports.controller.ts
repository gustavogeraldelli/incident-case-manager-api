import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('incidents/:incidentId/report')
  createIncidentReport(
    @CurrentUser() user: JwtUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: CreateIncidentReportDto,
  ) {
    return this.reportsService.createIncidentReport(user.id, incidentId, dto);
  }

  @Get('reports/:id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.reportsService.findOneForUser(user.id, id);
  }
}
