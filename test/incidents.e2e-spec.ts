import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  ActionStatus,
  ActionType,
  Criticality,
  Environment,
  EvidenceType,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  SystemType,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp } from './setup-e2e-app';

describe('Incidents (e2e)', () => {
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
        name: 'Incident User',
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

  async function createSystem(accessToken: string, organizationId: string) {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Incident System ${organizationId}`,
        type: SystemType.API,
        environment: Environment.PRODUCTION,
        criticality: Criticality.HIGH,
      })
      .expect(201);

    return response.body.id as string;
  }

  function incidentPayload(organizationId: string, systemId: string) {
    return {
      organizationId,
      systemId,
      title: 'Checkout latency spike',
      severity: IncidentSeverity.SEV2,
      category: IncidentCategory.PERFORMANCE,
      summary: 'Checkout requests are slower than the expected baseline.',
      impact: 'Customers may experience delayed payment confirmation.',
      detectedAt: '2026-07-26T12:00:00.000Z',
    };
  }

  it('creates an incident for a system in the user organization', async () => {
    const accessToken = await registerAndLogin(
      'create.incidents.e2e@example.com',
    );
    const organizationId = await createOrganization(
      accessToken,
      'incidents-create',
    );
    const systemId = await createSystem(accessToken, organizationId);

    const response = await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(incidentPayload(organizationId, systemId))
      .expect(201);

    expect(response.body).toMatchObject({
      organizationId,
      systemId,
      title: 'Checkout latency spike',
      severity: IncidentSeverity.SEV2,
      status: IncidentStatus.OPEN,
      category: IncidentCategory.PERFORMANCE,
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.createdById).toEqual(expect.any(String));
  });

  it('filters incidents by organization, system, status and severity', async () => {
    const accessToken = await registerAndLogin(
      'filter.incidents.e2e@example.com',
    );
    const organizationId = await createOrganization(
      accessToken,
      'incidents-filter',
    );
    const systemId = await createSystem(accessToken, organizationId);

    await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(incidentPayload(organizationId, systemId))
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/incidents')
      .query({
        organizationId,
        systemId,
        status: IncidentStatus.OPEN,
        severity: IncidentSeverity.SEV2,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          organizationId,
          systemId,
          status: IncidentStatus.OPEN,
          severity: IncidentSeverity.SEV2,
        });
      });
  });

  it('blocks creating an incident in another user organization', async () => {
    const ownerToken = await registerAndLogin(
      'owner.incidents.e2e@example.com',
    );
    const outsiderToken = await registerAndLogin(
      'outsider.incidents.e2e@example.com',
    );
    const organizationId = await createOrganization(
      ownerToken,
      'incidents-private',
    );
    const systemId = await createSystem(ownerToken, organizationId);

    await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send(incidentPayload(organizationId, systemId))
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Incident access denied');
      });
  });

  it('rejects an incident when the system belongs to another organization', async () => {
    const accessToken = await registerAndLogin(
      'system-mismatch.incidents.e2e@example.com',
    );
    const firstOrganizationId = await createOrganization(
      accessToken,
      'incidents-system-one',
    );
    const secondOrganizationId = await createOrganization(
      accessToken,
      'incidents-system-two',
    );
    const secondSystemId = await createSystem(
      accessToken,
      secondOrganizationId,
    );

    await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(incidentPayload(firstOrganizationId, secondSystemId))
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('System does not belong to organization');
      });
  });

  it('updates incident status through the dedicated status endpoint', async () => {
    const accessToken = await registerAndLogin(
      'status.incidents.e2e@example.com',
    );
    const organizationId = await createOrganization(
      accessToken,
      'incidents-status',
    );
    const systemId = await createSystem(accessToken, organizationId);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(incidentPayload(organizationId, systemId))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${createResponse.body.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        status: IncidentStatus.RESOLVED,
        resolvedAt: '2026-07-26T13:00:00.000Z',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: createResponse.body.id,
          status: IncidentStatus.RESOLVED,
        });
        expect(body.resolvedAt).toBe('2026-07-26T13:00:00.000Z');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${createResponse.body.id}/audit-logs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          organizationId,
          entityType: 'Incident',
          entityId: createResponse.body.id,
          action: 'incident.status_changed',
          before: {
            status: IncidentStatus.OPEN,
            resolvedAt: null,
          },
          after: {
            status: IncidentStatus.RESOLVED,
            resolvedAt: '2026-07-26T13:00:00.000Z',
          },
        });
      });

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/audit-logs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          entityType: 'Incident',
          entityId: createResponse.body.id,
          action: 'incident.status_changed',
        });
      });
  });

  it('blocks audit log access for users outside the organization', async () => {
    const ownerToken = await registerAndLogin(
      'audit-owner.incidents.e2e@example.com',
    );
    const outsiderToken = await registerAndLogin(
      'audit-outsider.incidents.e2e@example.com',
    );
    const organizationId = await createOrganization(
      ownerToken,
      'incidents-audit',
    );
    const systemId = await createSystem(ownerToken, organizationId);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(incidentPayload(organizationId, systemId))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${createResponse.body.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        status: IncidentStatus.INVESTIGATING,
      })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${createResponse.body.id}/audit-logs`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Audit log access denied');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/audit-logs`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Audit log access denied');
      });
  });

  it('covers the full incident response workflow', async () => {
    const ownerToken = await registerAndLogin('workflow.owner.e2e@example.com');
    const outsiderToken = await registerAndLogin(
      'workflow.outsider.e2e@example.com',
    );
    const organizationId = await createOrganization(ownerToken, 'workflow-org');
    const systemId = await createSystem(ownerToken, organizationId);

    const incidentResponse = await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        ...incidentPayload(organizationId, systemId),
        title: 'Workflow payment outage',
        severity: IncidentSeverity.SEV1,
        category: IncidentCategory.AVAILABILITY,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/incidents')
      .query({
        organizationId,
        systemId,
        status: IncidentStatus.OPEN,
        severity: IncidentSeverity.SEV1,
      })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: incidentResponse.body.id,
          organizationId,
          systemId,
          status: IncidentStatus.OPEN,
          severity: IncidentSeverity.SEV1,
        });
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${incidentResponse.body.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        status: IncidentStatus.INVESTIGATING,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: incidentResponse.body.id,
          status: IncidentStatus.INVESTIGATING,
          resolvedAt: null,
        });
      });

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incidentResponse.body.id}/audit-logs`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          entityType: 'Incident',
          entityId: incidentResponse.body.id,
          action: 'incident.status_changed',
          before: {
            status: IncidentStatus.OPEN,
            resolvedAt: null,
          },
          after: {
            status: IncidentStatus.INVESTIGATING,
            resolvedAt: null,
          },
        });
      });

    const evidenceResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentResponse.body.id}/evidences`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: EvidenceType.METRIC,
        content:
          'checkout_error_rate=38% window=5m dashboard=https://example.com/dash',
      })
      .expect(201);

    expect(evidenceResponse.body).toMatchObject({
      incidentId: incidentResponse.body.id,
      type: EvidenceType.METRIC,
    });

    const actionResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentResponse.body.id}/actions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: ActionType.MITIGATION,
        description: 'Route checkout traffic away from the failing dependency.',
        dueAt: '2026-07-26T14:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/actions/${actionResponse.body.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        status: ActionStatus.DONE,
        completedAt: '2026-07-26T14:30:00.000Z',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: actionResponse.body.id,
          status: ActionStatus.DONE,
        });
        expect(body.completedAt).toBe('2026-07-26T14:30:00.000Z');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incidentResponse.body.id}/evidences`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Evidence access denied');
      });

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentResponse.body.id}/actions`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({
        type: ActionType.INVESTIGATION,
        description: 'Unauthorized workflow action.',
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Response action access denied');
      });
  });
});
