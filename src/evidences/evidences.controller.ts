import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { EvidencesService } from './evidences.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('evidences')
@Controller()
export class EvidencesController {
  constructor(private readonly evidencesService: EvidencesService) {}

  @Get('incidents/:incidentId/evidences')
  findForIncident(
    @CurrentUser() user: JwtUser,
    @Param('incidentId') incidentId: string,
  ) {
    return this.evidencesService.findForIncident(user.id, incidentId);
  }

  @Post('incidents/:incidentId/evidences')
  create(
    @CurrentUser() user: JwtUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: CreateEvidenceDto,
  ) {
    return this.evidencesService.create(user.id, incidentId, dto);
  }

  @Delete('evidences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.evidencesService.remove(user.id, id);
  }
}
