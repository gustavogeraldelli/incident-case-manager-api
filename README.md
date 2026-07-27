# Incident Case Manager API

Incident Case Manager API is a backend service for coordinating incident response work across organizations and their systems. It is designed to help teams track incidents from detection to resolution, keep the operational context in one place, and preserve enough information to review what happened after the incident is closed.

The API will support organizations with multiple members and role-based access control. Each organization will be able to maintain a system inventory, register incidents against those systems, assign responders, update incident status, attach evidence, and coordinate response actions during the investigation and mitigation process.

It will also keep an audit trail of relevant changes, generate Markdown incident reports from the accumulated case data, expose dashboard summaries for operational visibility, and use Redis-backed caching for aggregate views that are expensive or frequently requested.

The goal is to model a realistic backend for incident response workflows: authentication, organization boundaries, persistence, validation, authorization, auditability, reporting, caching, API documentation, and automated tests.

## Tech Stack

- TypeScript
- NestJS
- PostgreSQL
- Prisma
- Redis
- JWT
- Swagger/OpenAPI
- Jest + Supertest
- Docker Compose

## API Documentation

When the application is running locally, Swagger is available at:

```text
http://localhost:3000/docs
```

