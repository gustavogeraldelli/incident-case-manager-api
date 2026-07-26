import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { EvidencesController } from './evidences.controller';
import { EvidencesService } from './evidences.service';

@Module({
  imports: [MembershipsModule],
  controllers: [EvidencesController],
  providers: [EvidencesService],
})
export class EvidencesModule {}
