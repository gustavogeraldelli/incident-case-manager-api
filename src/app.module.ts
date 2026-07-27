import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './cache/redis.module';
import { validateEnv } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { EvidencesModule } from './evidences/evidences.module';
import { ExportJobsModule } from './export-jobs/export-jobs.module';
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
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
        },
      }),
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
    ExportJobsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
