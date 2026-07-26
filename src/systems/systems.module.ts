import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { SystemsController } from './systems.controller';
import { SystemsService } from './systems.service';

@Module({
  imports: [MembershipsModule],
  controllers: [SystemsController],
  providers: [SystemsService],
})
export class SystemsModule {}
