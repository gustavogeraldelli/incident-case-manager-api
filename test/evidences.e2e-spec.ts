import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  Criticality,
  Environment,
  EvidenceType,
  IncidentCategory,
  IncidentSeverity,
  SystemType,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp } from './setup-e2e-app';

describe('Evidences (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.evidence.deleteMany();
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
        name: 'Evidence User',
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
        category: IncidentCategory.SECURITY,
        summary: 'Suspicious authentication activity was detected.',
        detectedAt: '2026-07-26T12:00:00.000Z',
      })
      .expect(201);

    return {
      incidentId: incidentResponse.body.id as string,
      organizationId: organizationResponse.body.id as string,
    };
  }

  it('creates and lists evidences for an accessible incident', async () => {
    const accessToken = await registerAndLogin('create.evidences.e2e@example.com');
    const { incidentId } = await createIncident(accessToken, 'evidences-create');

    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/evidences`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: EvidenceType.LOG,
        content: '2026-07-26T12:00:00Z failed-login user=alice source=10.0.0.1',
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      incidentId,
      type: EvidenceType.LOG,
      content: '2026-07-26T12:00:00Z failed-login user=alice source=10.0.0.1',
    });
    expect(createResponse.body.id).toEqual(expect.any(String));
    expect(createResponse.body.createdById).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incidentId}/evidences`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: createResponse.body.id,
          incidentId,
          type: EvidenceType.LOG,
        });
      });
  });

  it('blocks evidence creation for an incident outside the user organization', async () => {
    const ownerToken = await registerAndLogin('owner.evidences.e2e@example.com');
    const outsiderToken = await registerAndLogin(
      'outsider.evidences.e2e@example.com',
    );
    const { incidentId } = await createIncident(ownerToken, 'evidences-private');

    await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/evidences`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({
        type: EvidenceType.URL,
        content: 'https://example.com/private-dashboard',
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Evidence access denied');
      });
  });

  it('deletes evidence when the user has responder access or higher', async () => {
    const accessToken = await registerAndLogin('delete.evidences.e2e@example.com');
    const { incidentId } = await createIncident(accessToken, 'evidences-delete');

    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/evidences`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: EvidenceType.TEXT,
        content: 'Initial triage notes for the investigation.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/evidences/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await expect(
      prisma.evidence.findUnique({
        where: {
          id: createResponse.body.id,
        },
      }),
    ).resolves.toBeNull();
  });
});
