import { hashTenant } from '../../monitoring/metrics.js';

export function exportEvent(event: any) {
  const cleaned = { ...event };
  if (cleaned.tenantId) {
    if (process.env.ENABLE_TENANT_PII_EXPORT === 'true') {
      cleaned.tenantHash = hashTenant(cleaned.tenantId);
    } else {
      cleaned.tenantHash = hashTenant(cleaned.tenantId);
      delete cleaned.tenantId;
    }
  }
  // TODO: send to Splunk HEC
  return cleaned;
}
