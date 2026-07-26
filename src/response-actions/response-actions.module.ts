import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { ResponseActionsController } from './response-actions.controller';
import { ResponseActionsService } from './response-actions.service';

@Module({
  imports: [MembershipsModule],
  controllers: [ResponseActionsController],
  providers: [ResponseActionsService],
})
export class ResponseActionsModule {}
