export const DASHBOARD_SUMMARY_TTL_SECONDS = 60;

export function dashboardSummaryCacheKey(organizationId: string) {
  return `dashboard:organization:${organizationId}:summary`;
}
