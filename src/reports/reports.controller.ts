import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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

  @Get('reports/:id/markdown')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  async findMarkdown(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const report = await this.reportsService.findMarkdownForUser(user.id, id);

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${this.toFilename(report.title)}.md"`,
    );

    return report.markdown;
  }

  private toFilename(title: string) {
    const filename = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return filename || 'incident-report';
  }
}
