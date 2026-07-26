import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  imports: [AuditModule, MembershipsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}
