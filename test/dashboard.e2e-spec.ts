import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RedisService } from '../src/cache/redis.service';
import { dashboardSummaryCacheKey } from '../src/dashboard/dashboard-cache';
import {
  ActionType,
  Criticality,
  Environment,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  SystemType,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp } from './setup-e2e-app';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.exportJob.deleteMany();
    await prisma.incidentReport.deleteMany();
    await prisma.evidence.deleteMany();
    await prisma.responseAction.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.system.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAndLogin(email: string) {
    const password = 'strong-pass';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Dashboard User',
        email,
        password,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    return loginResponse.body.accessToken as string;
  }

  async function createOrganization(accessToken: string, slug: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: slug,
        slug,
      })
      .expect(201);

    return response.body.id as string;
  }

  async function createSystem(
    accessToken: string,
    organizationId: string,
    name: string,
  ) {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name,
        type: SystemType.API,
        environment: Environment.PRODUCTION,
        criticality: Criticality.HIGH,
      })
      .expect(201);

    return response.body.id as string;
  }

  async function createIncident(
    accessToken: string,
    organizationId: string,
    systemId: string,
    title: string,
    severity: IncidentSeverity,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        organizationId,
        systemId,
        title,
        severity,
        category: IncidentCategory.SECURITY,
        summary: 'A monitored production system triggered a security alert.',
        detectedAt: '2026-07-26T12:00:00.000Z',
      })
      .expect(201);

    return response.body.id as string;
  }

  async function createAction(accessToken: string, incidentId: string) {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/actions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: ActionType.CONTAINMENT,
        description: 'Temporarily isolate the affected integration.',
      })
      .expect(201);

    return response.body.id as string;
  }

  it('returns cached organization summary and invalidates it after mutations', async () => {
    const accessToken = await registerAndLogin('dashboard.e2e@example.com');
    const organizationId = await createOrganization(
      accessToken,
      'dashboard-summary',
    );
    const firstSystemId = await createSystem(
      accessToken,
      organizationId,
      'Payments API',
    );
    const secondSystemId = await createSystem(
      accessToken,
      organizationId,
      'Backoffice API',
    );

    const openIncidentId = await createIncident(
      accessToken,
      organizationId,
      firstSystemId,
      'Suspicious token usage',
      IncidentSeverity.SEV2,
    );
    const resolvedIncidentId = await createIncident(
      accessToken,
      organizationId,
      secondSystemId,
      'Unexpected admin access',
      IncidentSeverity.SEV3,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${resolvedIncidentId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        status: IncidentStatus.RESOLVED,
        resolvedAt: '2026-07-26T13:00:00.000Z',
      })
      .expect(200);

    await createAction(accessToken, openIncidentId);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/dashboard/summary`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          systems: 2,
          openIncidents: 1,
          pendingActions: 1,
          incidentsBySeverity: {
            SEV1: 0,
            SEV2: 1,
            SEV3: 1,
            SEV4: 0,
          },
          incidentsByStatus: {
            OPEN: 1,
            INVESTIGATING: 0,
            CONTAINED: 0,
            RESOLVED: 1,
            CLOSED: 0,
            FALSE_POSITIVE: 0,
          },
        });
      });

    await expect(
      redis.get(dashboardSummaryCacheKey(organizationId)),
    ).resolves.not.toBeNull();

    await createAction(accessToken, openIncidentId);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/dashboard/summary`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.pendingActions).toBe(2);
      });
  });

  it('blocks dashboard access for users outside the organization', async () => {
    const ownerToken = await registerAndLogin(
      'dashboard.owner.e2e@example.com',
    );
    const outsiderToken = await registerAndLogin(
      'dashboard.outsider.e2e@example.com',
    );
    const organizationId = await createOrganization(
      ownerToken,
      'dashboard-private',
    );

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/dashboard/summary`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Organization access denied');
      });
  });
});
