import fs from 'fs';
import yaml from 'js-yaml';

/**
 * RetentionService removes data older than policy for each tenant.
 * Implementation is a placeholder; integrate with database in future.
 */
export class RetentionService {
  policies: Record<string, string>;

  constructor(configPath = 'config/retention/policies.yaml') {
    const raw = fs.readFileSync(configPath, 'utf-8');
    this.policies = yaml.load(raw) as Record<string, any>;
  }

  getRetentionDays(tenantId: string): number {
    const tenant = this.policies.tenants?.[tenantId];
    const value = tenant || this.policies.default || '90d';
    return parseInt(value);
  }
}
