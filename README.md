# Incident Case Manager API

[![CI](https://github.com/gustavogeraldelli/incident-case-manager-api/actions/workflows/ci.yml/badge.svg)](https://github.com/gustavogeraldelli/incident-case-manager-api/actions/workflows/ci.yml)

Incident Case Manager API is a NestJS backend for managing incident response workflows across organizations and their systems. It models the lifecycle of an incident from detection to resolution: system ownership, incident registration, evidence collection, response actions, audit history, final reports and operational dashboard summaries.

The project is designed as a portfolio backend focused on realistic application concerns: authentication, organization-scoped authorization, relational modeling, request validation, database migrations, auditability, background jobs, caching, OpenAPI documentation, automated tests and CI.

## Features

- JWT authentication with refresh token rotation.
- Organization membership with role-based access control.
- System inventory scoped by organization.
- Incident creation, filtering, assignment and status updates.
- Evidence records attached to incidents.
- Response actions with ownership, status and completion tracking.
- Audit logs for relevant incident changes.
- Markdown incident reports generated from case data.
- Markdown report download endpoint.
- Asynchronous report export using BullMQ and Redis.
- Export job status tracking through the API.
- Dashboard summary endpoint with Redis-backed cache.
- Swagger/OpenAPI documentation.
- Unit and e2e test coverage with PostgreSQL and Redis.
- GitHub Actions workflow with build, Prisma generation and tests.

## Tech Stack

- TypeScript
- NestJS
- PostgreSQL
- Prisma
- Redis
- BullMQ
- JWT / Passport
- Swagger / OpenAPI
- Jest
- Supertest
- Docker Compose
- GitHub Actions

## Architecture Overview

The application follows the standard NestJS structure of modules, controllers and services.

```text
src/
  auth/              authentication and JWT strategy
  users/             user persistence
  organizations/     organization ownership and membership entry point
  memberships/       role lookup and role comparison
  systems/           organization system inventory
  incidents/         incident lifecycle
  evidences/         incident evidence records
  response-actions/  incident response tasks
  audit/             audit log queries and recording
  reports/           incident reports and report export queue processor
  export-jobs/       persisted async export job status
  dashboard/         aggregate organization summary
  cache/             Redis client wrapper
  prisma/            Prisma service
  common/            shared decorators and guards
```

PostgreSQL is used as the source of truth for users, refresh tokens, organizations, systems, incidents, evidence, response actions, audit logs, reports and export jobs. Prisma manages the schema, migrations and type-safe database access.

Redis is used in two ways:

- dashboard cache for aggregate organization summaries;
- BullMQ backend for asynchronous report export jobs.

Request DTOs are validated with `class-validator` through Nest's global `ValidationPipe`. Environment variables are validated separately with Zod during application startup.

## Main Flow

The main API flow is:

1. A user registers and logs in.
2. The user creates an organization and becomes its owner.
3. The organization registers systems it operates.
4. A responder creates an incident for one of those systems.
5. The team attaches evidence and response actions during investigation.
6. Incident status changes are recorded in the audit log, preserving the relevant timeline for later review.
7. Once resolved, a report is generated as a Markdown snapshot.
8. The report can be downloaded directly or exported asynchronously.
9. Dashboard summary endpoints provide aggregate operational visibility.

## API Overview

The API exposes the incident response flow through resource-oriented endpoints under `/api/v1`.

Authentication starts with `POST /api/v1/auth/register` and `POST /api/v1/auth/login`. Login returns an access token and a refresh token. Authenticated requests use the access token as a Bearer token, `POST /api/v1/auth/refresh` rotates refresh tokens, `POST /api/v1/auth/logout` revokes a refresh token, and `GET /api/v1/auth/me` returns the current user.

Organizations are managed through `/api/v1/organizations`, while systems are nested under an organization with routes such as `POST /api/v1/organizations/:organizationId/systems`.

Incidents are managed through `/api/v1/incidents`. Supporting incident data is added through nested routes like `/api/v1/incidents/:incidentId/evidences` and `/api/v1/incidents/:incidentId/actions`, while status-specific changes use dedicated endpoints such as `PATCH /api/v1/incidents/:id/status` and `PATCH /api/v1/actions/:id/status`.

Reports are generated from resolved incidents with `POST /api/v1/incidents/:incidentId/report`. A report can be downloaded as Markdown through `GET /api/v1/reports/:id/markdown` or exported asynchronously through `POST /api/v1/reports/:id/export`, with status available at `GET /api/v1/export-jobs/:id`.

Operational summaries are available through `GET /api/v1/organizations/:organizationId/dashboard/summary`.

The full OpenAPI contract is available through Swagger when the application is running:

```text
http://localhost:3000/docs
```

The Swagger UI includes route groups, request DTO schemas, enum values and Bearer authentication support.

## Getting Started

Install dependencies:

```bash
npm install
```

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

Create a local environment file:

```bash
cp .env.example .env
```

Run database migrations and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the API in watch mode:

```bash
npm run start:dev
```

The API runs at:

```text
http://localhost:3000/api/v1
```

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/incident_case_manager?schema=public"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/incident_case_manager_test?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN_DAYS=7
PORT=3000
```

`DATABASE_URL` is used for local development.

`TEST_DATABASE_URL` is used by e2e tests. The test setup creates the test database if needed and applies Prisma migrations before the test suite runs.

## Testing

Run unit tests:

```bash
npm test
```

Run e2e tests:

```bash
npm run test:e2e
```

The e2e suite uses a real PostgreSQL database and Redis instance. It points to `TEST_DATABASE_URL`, so test cleanup does not erase the local development database.

This keeps the test environment close to the application runtime while still isolating destructive test cleanup from local development data.

## Useful Scripts

```bash
npm run build
npm run start:dev
npm run test
npm run test:e2e
npm run prisma:migrate
npm run prisma:generate
npm run prisma:studio
```
