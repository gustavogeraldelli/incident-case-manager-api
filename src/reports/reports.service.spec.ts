import {
  type ActionStatus,
  type ActionType,
  type Criticality,
  type Environment,
  type EvidenceType,
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
  type SystemType,
} from '../generated/prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const service = new ReportsService({} as never, {} as never);

  it('builds incident report markdown with the main sections', () => {
    const detectedAt = new Date('2026-07-26T12:00:00.000Z');
    const resolvedAt = new Date('2026-07-26T13:00:00.000Z');

    const markdown = service.buildMarkdown({
      incident: {
        id: 'incident-1',
        organizationId: 'organization-1',
        systemId: 'system-1',
        title: 'Checkout outage',
        severity: 'SEV1' as IncidentSeverity,
        status: 'RESOLVED' as IncidentStatus,
        category: 'AVAILABILITY' as IncidentCategory,
        summary: 'Checkout was unavailable for production users.',
        impact: 'Customers could not complete payments.',
        rootCause: 'Third-party payment dependency degraded.',
        detectedAt,
        resolvedAt,
        createdAt: detectedAt,
        updatedAt: resolvedAt,
        system: {
          name: 'Payment API',
          type: 'API' as SystemType,
          environment: 'PRODUCTION' as Environment,
          criticality: 'CRITICAL' as Criticality,
          ownerTeam: 'Payments',
        },
        evidences: [
          {
            type: 'METRIC' as EvidenceType,
            content: 'checkout_error_rate=38%',
            createdAt: detectedAt,
          },
        ],
        actions: [
          {
            type: 'MITIGATION' as ActionType,
            description: 'Route traffic away from the failing dependency.',
            status: 'DONE' as ActionStatus,
            dueAt: null,
            completedAt: resolvedAt,
            createdAt: detectedAt,
          },
        ],
        auditLogs: [
          {
            action: 'incident.status_changed',
            before: { status: 'OPEN', resolvedAt: null },
            after: { status: 'RESOLVED', resolvedAt: resolvedAt.toISOString() },
            createdAt: resolvedAt,
          },
        ],
      },
      timeline: '- Status changed from OPEN to RESOLVED',
      resolution: '- [MITIGATION] Route traffic away from the failing dependency.',
      lessonsLearned: 'Improve provider failover testing.',
      preventiveActions: 'Add synthetic checkout monitoring.',
    });

    expect(markdown).toContain('# Incident Report: Checkout outage');
    expect(markdown).toContain('## Summary');
    expect(markdown).toContain('Checkout was unavailable for production users.');
    expect(markdown).toContain('## Impact');
    expect(markdown).toContain('Customers could not complete payments.');
    expect(markdown).toContain('## Evidences');
    expect(markdown).toContain('[METRIC] checkout_error_rate=38%');
    expect(markdown).toContain('## Response Actions');
    expect(markdown).toContain('[DONE] [MITIGATION]');
    expect(markdown).toContain('## Lessons Learned');
    expect(markdown).toContain('Improve provider failover testing.');
  });
});
