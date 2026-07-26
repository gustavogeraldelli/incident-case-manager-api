import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateResponseActionDto } from './dto/create-response-action.dto';
import { UpdateActionStatusDto } from './dto/update-action-status.dto';
import { UpdateResponseActionDto } from './dto/update-response-action.dto';
import { ResponseActionsService } from './response-actions.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('response-actions')
@Controller()
export class ResponseActionsController {
  constructor(private readonly responseActionsService: ResponseActionsService) {}

  @Get('incidents/:incidentId/actions')
  findForIncident(
    @CurrentUser() user: JwtUser,
    @Param('incidentId') incidentId: string,
  ) {
    return this.responseActionsService.findForIncident(user.id, incidentId);
  }

  @Post('incidents/:incidentId/actions')
  create(
    @CurrentUser() user: JwtUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: CreateResponseActionDto,
  ) {
    return this.responseActionsService.create(user.id, incidentId, dto);
  }

  @Patch('actions/:id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateResponseActionDto,
  ) {
    return this.responseActionsService.update(user.id, id, dto);
  }

  @Patch('actions/:id/status')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateActionStatusDto,
  ) {
    return this.responseActionsService.updateStatus(user.id, id, dto);
  }

  @Delete('actions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.responseActionsService.remove(user.id, id);
  }
}
