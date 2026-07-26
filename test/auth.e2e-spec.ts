import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp } from './setup-e2e-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const registerPayload = {
    name: 'Gustavo',
    email: 'gustavo.auth.e2e@example.com',
    password: 'strong-pass',
  };

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
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

  it('registers a user without returning passwordHash', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(201);

    expect(response.body).toMatchObject({
      name: registerPayload.name,
      email: registerPayload.email,
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.createdAt).toEqual(expect.any(String));
    expect(response.body.updatedAt).toEqual(expect.any(String));
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('rejects invalid register payloads and extra fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'A',
        email: 'invalid-email',
        password: 'short',
        isAdmin: true,
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'property isAdmin should not exist',
        'name must be longer than or equal to 2 characters',
        'email must be an email',
        'password must be longer than or equal to 8 characters',
      ]),
    );
  });

  it('rejects duplicated email registration', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe('Email is already registered');
      });
  });

  it('logs in with valid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: registerPayload.password,
      })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects login with invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: 'wrong-pass',
      })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Invalid credentials');
      });
  });

  it('blocks /auth/me without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('returns the current user with a valid bearer token', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: registerPayload.password,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: registerResponse.body.id,
          email: registerPayload.email,
        });
      });
  });
});
