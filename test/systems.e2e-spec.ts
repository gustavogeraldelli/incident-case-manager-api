import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  Criticality,
  Environment,
  SystemType,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp } from './setup-e2e-app';

describe('Systems (e2e)', () => {
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
        name: 'Systems User',
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

  it('creates a system in an organization where the user is a member', async () => {
    const accessToken = await registerAndLogin(
      'create.systems.e2e@example.com',
    );
    const organizationId = await createOrganization(
      accessToken,
      'systems-create',
    );

    const response = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Payments API',
        type: SystemType.API,
        environment: Environment.PRODUCTION,
        ownerTeam: 'Platform',
        description: 'Processes payment requests',
        criticality: Criticality.CRITICAL,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      organizationId,
      name: 'Payments API',
      type: SystemType.API,
      environment: Environment.PRODUCTION,
      ownerTeam: 'Platform',
      description: 'Processes payment requests',
      criticality: Criticality.CRITICAL,
    });
    expect(response.body.id).toEqual(expect.any(String));
  });

  it('lists systems only for the requested organization', async () => {
    const accessToken = await registerAndLogin('list.systems.e2e@example.com');
    const firstOrganizationId = await createOrganization(
      accessToken,
      'systems-list-one',
    );
    const secondOrganizationId = await createOrganization(
      accessToken,
      'systems-list-two',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${firstOrganizationId}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Customer Portal',
        type: SystemType.WEB_APP,
        environment: Environment.PRODUCTION,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${secondOrganizationId}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Internal Queue',
        type: SystemType.QUEUE,
        environment: Environment.STAGING,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${firstOrganizationId}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          organizationId: firstOrganizationId,
          name: 'Customer Portal',
        });
      });
  });

  it('blocks creating a system in another user organization', async () => {
    const ownerToken = await registerAndLogin('owner.systems.e2e@example.com');
    const outsiderToken = await registerAndLogin(
      'outsider.systems.e2e@example.com',
    );
    const organizationId = await createOrganization(
      ownerToken,
      'systems-private',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/systems`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({
        name: 'Forbidden API',
        type: SystemType.API,
        environment: Environment.PRODUCTION,
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Organization access denied');
      });
  });

  it('updates and deletes a system when the user has responder access or higher', async () => {
    const accessToken = await registerAndLogin(
      'mutate.systems.e2e@example.com',
    );
    const organizationId = await createOrganization(
      accessToken,
      'systems-mutate',
    );

    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Legacy API',
        type: SystemType.API,
        environment: Environment.PRODUCTION,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/systems/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Modern API',
        criticality: Criticality.HIGH,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: createResponse.body.id,
          name: 'Modern API',
          criticality: Criticality.HIGH,
        });
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/systems/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await expect(
      prisma.system.findUnique({
        where: {
          id: createResponse.body.id,
        },
      }),
    ).resolves.toBeNull();
  });

  it('rejects duplicate systems in the same organization and environment', async () => {
    const accessToken = await registerAndLogin(
      'duplicate.systems.e2e@example.com',
    );
    const organizationId = await createOrganization(
      accessToken,
      'systems-duplicate',
    );

    const payload = {
      name: 'Billing API',
      type: SystemType.API,
      environment: Environment.PRODUCTION,
    };

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/systems`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'System already exists for this organization and environment',
        );
      });
  });
});
