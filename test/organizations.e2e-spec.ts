import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MembershipRole } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp } from './setup-e2e-app';

describe('Organizations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
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

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Organization User',
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

    return {
      accessToken: loginResponse.body.accessToken as string,
      userId: registerResponse.body.id as string,
    };
  }

  it('creates an organization for an authenticated user', async () => {
    const user = await registerAndLogin('owner.organizations.e2e@example.com');

    const response = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'Acme SOC',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Acme SOC',
      slug: 'acme-soc',
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.createdAt).toEqual(expect.any(String));
    expect(response.body.updatedAt).toEqual(expect.any(String));
  });

  it('creates an owner membership when an organization is created', async () => {
    const user = await registerAndLogin('membership.organizations.e2e@example.com');

    const response = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'Membership Lab',
        slug: 'membership-lab',
      })
      .expect(201);

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.userId,
          organizationId: response.body.id,
        },
      },
    });

    expect(membership).toMatchObject({
      role: MembershipRole.OWNER,
    });
  });

  it('lists only organizations where the user is a member', async () => {
    const owner = await registerAndLogin('owner.list.organizations.e2e@example.com');
    const outsider = await registerAndLogin(
      'outsider.list.organizations.e2e@example.com',
    );

    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Owner Organization',
        slug: 'owner-organization',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({
        name: 'Outsider Organization',
        slug: 'outsider-organization',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          name: 'Owner Organization',
          slug: 'owner-organization',
          memberships: [{ role: MembershipRole.OWNER }],
        });
      });
  });

  it('allows a member to access its organization by id', async () => {
    const user = await registerAndLogin('find.organizations.e2e@example.com');

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'Findable Organization',
        slug: 'findable-organization',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: createResponse.body.id,
          name: 'Findable Organization',
          slug: 'findable-organization',
          memberships: [{ role: MembershipRole.OWNER }],
        });
      });
  });

  it('blocks access to another user organization', async () => {
    const owner = await registerAndLogin('owner.block.organizations.e2e@example.com');
    const outsider = await registerAndLogin(
      'outsider.block.organizations.e2e@example.com',
    );

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Private Organization',
        slug: 'private-organization',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Organization access denied');
      });
  });

  it('rejects invalid organization payloads', async () => {
    const user = await registerAndLogin('invalid.organizations.e2e@example.com');

    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'A',
        slug: 'Invalid Slug',
        extra: true,
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(
          expect.arrayContaining([
            'property extra should not exist',
            'name must be longer than or equal to 2 characters',
            'slug must match /^[a-z0-9]+(?:-[a-z0-9]+)*$/ regular expression',
          ]),
        );
      });
  });

  it('blocks organization endpoints without a token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .send({
        name: 'No Token Organization',
      })
      .expect(401);

    await request(app.getHttpServer()).get('/api/v1/organizations').expect(401);
  });
});
