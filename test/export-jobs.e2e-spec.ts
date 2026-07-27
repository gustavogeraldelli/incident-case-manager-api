import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  ActionStatus,
  ActionType,
  Criticality,
  Environment,
  EvidenceType,
  ExportJobStatus,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  SystemType,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp } from './setup-e2e-app';

describe('Export jobs (e2e)', () => {
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
        name: 'Export User',
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

  async function createReport(accessToken: string, slug: string) {
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
        category: IncidentCategory.SECURITY,
        summary:
          'A production security incident required coordinated response.',
        impact: 'Sensitive operational access required review.',
        rootCause: 'Compromised service token.',
        detectedAt: '2026-07-26T12:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentResponse.body.id}/evidences`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: EvidenceType.LOG,
        content: 'auth_token_used_from_unexpected_network=true',
      })
      .expect(201);

    const actionResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentResponse.body.id}/actions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: ActionType.CONTAINMENT,
        description: 'Revoke the compromised service token.',
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
      .patch(`/api/v1/incidents/${incidentResponse.body.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        status: IncidentStatus.RESOLVED,
        resolvedAt: '2026-07-26T14:00:00.000Z',
      })
      .expect(200);

    const reportResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentResponse.body.id}/report`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        lessonsLearned: 'Rotate sensitive service tokens more frequently.',
      })
      .expect(201);

    return reportResponse.body.id as string;
  }

  it('creates an export job and completes it asynchronously', async () => {
    const accessToken = await registerAndLogin('export.jobs.e2e@example.com');
    const reportId = await createReport(accessToken, 'export-jobs');

    const exportResponse = await request(app.getHttpServer())
      .post(`/api/v1/reports/${reportId}/export`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(exportResponse.body).toMatchObject({
      reportId,
      status: ExportJobStatus.PENDING,
      result: null,
      error: null,
    });
    expect(exportResponse.body.id).toEqual(expect.any(String));

    const completedJob = await waitForCompletedJob(
      accessToken,
      exportResponse.body.id,
    );

    expect(completedJob).toMatchObject({
      id: exportResponse.body.id,
      reportId,
      status: ExportJobStatus.COMPLETED,
      error: null,
    });
    expect(completedJob.result).toContain(
      '# Incident Report: export-jobs incident',
    );
    expect(completedJob.result).toContain(
      'auth_token_used_from_unexpected_network=true',
    );
    expect(completedJob.finishedAt).toEqual(expect.any(String));
  });

  it('blocks export job lookup for users outside the organization', async () => {
    const ownerToken = await registerAndLogin('export.owner.e2e@example.com');
    const outsiderToken = await registerAndLogin(
      'export.outsider.e2e@example.com',
    );
    const reportId = await createReport(ownerToken, 'export-private');

    const exportResponse = await request(app.getHttpServer())
      .post(`/api/v1/reports/${reportId}/export`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/export-jobs/${exportResponse.body.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Export job not found');
      });
  });

  async function waitForCompletedJob(accessToken: string, exportJobId: string) {
    const deadline = Date.now() + 3000;
    let lastBody: Record<string, unknown> | undefined;

    while (Date.now() < deadline) {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/export-jobs/${exportJobId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      lastBody = response.body as Record<string, unknown>;

      if (response.body.status === ExportJobStatus.COMPLETED) {
        return response.body;
      }

      if (response.body.status === ExportJobStatus.FAILED) {
        throw new Error(`Export job failed: ${response.body.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(
      `Export job did not complete in time. Last status: ${String(
        lastBody?.status,
      )}`,
    );
  }
});
