import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './cache/redis.module';
import { validateEnv } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { EvidencesModule } from './evidences/evidences.module';
import { IncidentsModule } from './incidents/incidents.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResponseActionsModule } from './response-actions/response-actions.module';
import { ReportsModule } from './reports/reports.module';
import { SystemsModule } from './systems/systems.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    RedisModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    SystemsModule,
    IncidentsModule,
    AuditModule,
    EvidencesModule,
    ResponseActionsModule,
    ReportsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
