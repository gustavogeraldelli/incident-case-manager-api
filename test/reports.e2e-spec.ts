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

describe('Reports (e2e)', () => {
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
        name: 'Report User',
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
        criticality: Criticality.CRITICAL,
      })
      .expect(201);

    const incidentResponse = await request(app.getHttpServer())
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        organizationId: organizationResponse.body.id,
        systemId: systemResponse.body.id,
        title: `${slug} incident`,
        severity: IncidentSeverity.SEV1,
        category: IncidentCategory.AVAILABILITY,
        summary: 'Checkout was unavailable for production users.',
        impact: 'Customers could not complete payments.',
        rootCause: 'Third-party payment dependency degraded.',
        detectedAt: '2026-07-26T12:00:00.000Z',
      })
      .expect(201);

    return incidentResponse.body.id as string;
  }

  async function enrichAndResolveIncident(
    accessToken: string,
    incidentId: string,
  ) {
    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/evidences`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: EvidenceType.METRIC,
        content: 'checkout_error_rate=38%',
      })
      .expect(201);

    const actionResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/actions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: ActionType.MITIGATION,
        description: 'Route traffic away from the failing dependency.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/actions/${actionResponse.body.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        status: ActionStatus.DONE,
        completedAt: '2026-07-26T13:30:00.000Z',
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        status: IncidentStatus.RESOLVED,
        resolvedAt: '2026-07-26T14:00:00.000Z',
      })
      .expect(200);
  }

  it('generates and fetches an incident report for an authorized user', async () => {
    const accessToken = await registerAndLogin(
      'create.reports.e2e@example.com',
    );
    const incidentId = await createIncident(accessToken, 'reports-create');
    await enrichAndResolveIncident(accessToken, incidentId);

    const reportResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/report`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        lessonsLearned: 'Improve provider failover testing.',
        preventiveActions: 'Add synthetic checkout monitoring.',
      })
      .expect(201);

    expect(reportResponse.body).toMatchObject({
      incidentId,
      title: 'reports-create incident',
      summary: 'Checkout was unavailable for production users.',
      lessonsLearned: 'Improve provider failover testing.',
      preventiveActions: 'Add synthetic checkout monitoring.',
    });
    expect(reportResponse.body.markdown).toContain('## Evidences');
    expect(reportResponse.body.markdown).toContain('checkout_error_rate=38%');
    expect(reportResponse.body.markdown).toContain('## Response Actions');
    expect(reportResponse.body.markdown).toContain(
      'Route traffic away from the failing dependency.',
    );

    await request(app.getHttpServer())
      .get(`/api/v1/reports/${reportResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: reportResponse.body.id,
          incidentId,
        });
      });

    await request(app.getHttpServer())
      .get(`/api/v1/reports/${reportResponse.body.id}/markdown`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect('Content-Type', /text\/markdown/)
      .expect(
        'Content-Disposition',
        'attachment; filename="reports-create-incident.md"',
      )
      .expect(({ text }) => {
        expect(text).toContain('# Incident Report: reports-create incident');
        expect(text).toContain('## Evidences');
        expect(text).toContain('checkout_error_rate=38%');
      });
  });

  it('rejects report generation for an open incident', async () => {
    const accessToken = await registerAndLogin('open.reports.e2e@example.com');
    const incidentId = await createIncident(accessToken, 'reports-open');

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/report`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Incident report can only be generated for resolved, closed or false positive incidents',
        );
      });
  });

  it('rejects a second report for the same incident', async () => {
    const accessToken = await registerAndLogin(
      'duplicate.reports.e2e@example.com',
    );
    const incidentId = await createIncident(accessToken, 'reports-duplicate');
    await enrichAndResolveIncident(accessToken, incidentId);

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/report`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/report`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe('Incident report already exists');
      });
  });

  it('blocks report generation and reading for users outside the organization', async () => {
    const ownerToken = await registerAndLogin('owner.reports.e2e@example.com');
    const outsiderToken = await registerAndLogin(
      'outsider.reports.e2e@example.com',
    );
    const incidentId = await createIncident(ownerToken, 'reports-private');
    await enrichAndResolveIncident(ownerToken, incidentId);

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/report`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({})
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Incident report access denied');
      });

    const reportResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/report`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/reports/${reportResponse.body.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Incident report access denied');
      });
  });
});
