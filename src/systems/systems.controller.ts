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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OrganizationRoleGuard } from '../common/guards/organization-role.guard';
import { MembershipRole } from '../generated/prisma/client';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';
import { SystemsService } from './systems.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SystemsController {
  constructor(private readonly systemsService: SystemsService) {}

  @Get('organizations/:organizationId/systems')
  @UseGuards(OrganizationRoleGuard)
  @Roles(MembershipRole.VIEWER)
  findAllForOrganization(@Param('organizationId') organizationId: string) {
    return this.systemsService.findAllForOrganization(organizationId);
  }

  @Post('organizations/:organizationId/systems')
  @UseGuards(OrganizationRoleGuard)
  @Roles(MembershipRole.RESPONDER)
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateSystemDto,
  ) {
    return this.systemsService.create(organizationId, dto);
  }

  @Get('systems/:id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.systemsService.findOneForUser(user.id, id);
  }

  @Patch('systems/:id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateSystemDto,
  ) {
    return this.systemsService.updateForUser(user.id, id, dto);
  }

  @Delete('systems/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.systemsService.removeForUser(user.id, id);
  }
}
