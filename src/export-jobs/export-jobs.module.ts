import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { ExportJobsController } from './export-jobs.controller';
import { ExportJobsService } from './export-jobs.service';

@Module({
  imports: [MembershipsModule],
  controllers: [ExportJobsController],
  providers: [ExportJobsService],
  exports: [ExportJobsService],
})
export class ExportJobsModule {}
