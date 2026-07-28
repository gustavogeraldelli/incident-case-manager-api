import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  ActionStatus,
  ActionType,
  Criticality,
  Environment,
  IncidentCategory,
  IncidentSeverity,
  SystemType,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp } from './setup-e2e-app';

describe('Response actions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
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
    await prisma.refreshToken.deleteMany();
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
        name: 'Action User',
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

  async function createIncident(accessToken: string, slug: string) {
    const organizationResponse = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: slug,
        slug,
      })
      .expect(201);

    const systemResponse = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationResponse.body.id}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `${slug} API`,
        type: SystemType.API,
        environment: Environment.PRODUCTION,
        criticality: Criticality.HIGH,
      })
      .expect(201);

    const incidentResponse = await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        organizationId: organizationResponse.body.id,
        systemId: systemResponse.body.id,
        title: `${slug} incident`,
        severity: IncidentSeverity.SEV2,
        category: IncidentCategory.AVAILABILITY,
        summary: 'A production dependency is returning elevated error rates.',
        detectedAt: '2026-07-26T12:00:00.000Z',
      })
      .expect(201);

    return incidentResponse.body.id as string;
  }

  it('creates and lists response actions for an accessible incident', async () => {
    const accessToken = await registerAndLogin(
      'create.actions.e2e@example.com',
    );
    const incidentId = await createIncident(accessToken, 'actions-create');

    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/actions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: ActionType.CONTAINMENT,
        description: 'Temporarily disable the failing integration.',
        dueAt: '2026-07-26T14:00:00.000Z',
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      incidentId,
      type: ActionType.CONTAINMENT,
      description: 'Temporarily disable the failing integration.',
      status: ActionStatus.TODO,
      completedAt: null,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incidentId}/actions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: createResponse.body.id,
          incidentId,
          type: ActionType.CONTAINMENT,
        });
      });
  });

  it('marks an action as done and fills completedAt', async () => {
    const accessToken = await registerAndLogin('done.actions.e2e@example.com');
    const incidentId = await createIncident(accessToken, 'actions-done');

    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/actions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: ActionType.MITIGATION,
        description: 'Deploy the configuration rollback.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/actions/${createResponse.body.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        status: ActionStatus.DONE,
        completedAt: '2026-07-26T15:00:00.000Z',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: createResponse.body.id,
          status: ActionStatus.DONE,
        });
        expect(body.completedAt).toBe('2026-07-26T15:00:00.000Z');
      });
  });

  it('blocks creating actions for an incident outside the user organization', async () => {
    const ownerToken = await registerAndLogin('owner.actions.e2e@example.com');
    const outsiderToken = await registerAndLogin(
      'outsider.actions.e2e@example.com',
    );
    const incidentId = await createIncident(ownerToken, 'actions-private');

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/actions`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({
        type: ActionType.INVESTIGATION,
        description: 'Review private incident timeline.',
      })
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Incident not found');
      });
  });

  it('updates and deletes response actions', async () => {
    const accessToken = await registerAndLogin(
      'mutate.actions.e2e@example.com',
    );
    const incidentId = await createIncident(accessToken, 'actions-mutate');

    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/actions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: ActionType.FOLLOW_UP,
        description: 'Write follow up notes.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/actions/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        description: 'Write follow up notes and owner summary.',
        type: ActionType.COMMUNICATION,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: createResponse.body.id,
          description: 'Write follow up notes and owner summary.',
          type: ActionType.COMMUNICATION,
        });
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/actions/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await expect(
      prisma.responseAction.findUnique({
        where: {
          id: createResponse.body.id,
        },
      }),
    ).resolves.toBeNull();
  });
});
