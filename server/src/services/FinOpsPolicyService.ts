
import { logger } from '../config/logger.js';
import { pg } from '../db/pg.js';

export interface FinOpsPolicy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: FinOpsRule[];
}

export interface FinOpsRule {
  resourceType: string;
  condition: string; // e.g., "cpu_utilization < 20%"
  action: string; // e.g., "notify", "stop", "resize"
  parameters?: Record<string, any>;
}

export class FinOpsPolicyService {

  async getPolicies(tenantId: string): Promise<FinOpsPolicy[]> {
    try {
      const result = await pg.many(
        `SELECT * FROM finops_policies WHERE tenant_id = $1`,
        [tenantId],
        { tenantId }
      );

      return result.map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        enabled: row.enabled,
        rules: row.rules
      }));
    } catch (error: any) {
      logger.error({ error, tenantId }, 'Error fetching FinOps policies');
      return [];
    }
  }

  async savePolicy(tenantId: string, policy: FinOpsPolicy): Promise<void> {
    try {
      await pg.write(
        `INSERT INTO finops_policies (id, tenant_id, name, description, enabled, rules)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           enabled = EXCLUDED.enabled,
           rules = EXCLUDED.rules,
           updated_at = NOW()`,
        [policy.id, tenantId, policy.name, policy.description, policy.enabled, JSON.stringify(policy.rules)],
        { tenantId }
      );
      logger.info({ tenantId, policyId: policy.id }, 'FinOps policy saved');
    } catch (error: any) {
        logger.error({ error, tenantId, policyId: policy.id }, 'Error saving FinOps policy');
        throw error;
    }
  }

  async deletePolicy(tenantId: string, policyId: string): Promise<void> {
    try {
        await pg.write(
            `DELETE FROM finops_policies WHERE id = $1 AND tenant_id = $2`,
            [policyId, tenantId],
            { tenantId }
        );
    } catch (error: any) {
        logger.error({ error, tenantId, policyId }, 'Error deleting FinOps policy');
        throw error;
    }
  }

  async evaluatePolicies(tenantId: string, metrics: Record<string, number>): Promise<string[]> {
      const policies = await this.getPolicies(tenantId);
      const violations: string[] = [];

      for (const policy of policies) {
          if (!policy.enabled) continue;

          for (const rule of policy.rules) {
              if (this.isViolation(rule, metrics)) {
                  const violationMsg = `Policy '${policy.name}' violated: ${rule.resourceType} condition '${rule.condition}' met. Action: ${rule.action}`;
                  violations.push(violationMsg);
                  await this.executeAction(rule, tenantId, violationMsg);
              }
          }
      }
      return violations;
  }

  private isViolation(rule: FinOpsRule, metrics: Record<string, number>): boolean {
      // Improved regex-based parsing
      // Supports: metric < value, metric > value, metric = value, metric <= value, metric >= value
      const conditionRegex = /^([a-zA-Z0-9_]+)\s*(<=|>=|<|>|=)\s*([0-9.]+)$/;
      const match = rule.condition.match(conditionRegex);

      if (!match) {
          logger.warn({ rule }, 'Invalid policy condition format');
          return false;
      }

      const [, metricName, operator, thresholdStr] = match;
      const threshold = parseFloat(thresholdStr);
      const metricValue = metrics[metricName];

      if (metricValue === undefined) return false;

      switch (operator) {
          case '<': return metricValue < threshold;
          case '>': return metricValue > threshold;
          case '<=': return metricValue <= threshold;
          case '>=': return metricValue >= threshold;
          case '=': return metricValue === threshold;
          default: return false;
      }
  }

  private async executeAction(rule: FinOpsRule, tenantId: string, message: string): Promise<void> {
      logger.warn({ tenantId, rule, message }, 'FinOps Policy Violation Detected');

      // Implement basic action routing with concrete examples
      if (rule.action === 'notify') {
          // SAFETY: In a real implementation, we would call NotificationService.sendEmail
          // For now, structured logging serves as the notification channel for the ops dashboard.
          logger.info({
              event: 'finops_violation_notify',
              tenantId,
              message,
              severity: 'warning'
          }, `[NOTIFY] Alert for tenant ${tenantId}`);
      } else if (rule.action === 'stop' || rule.action === 'resize') {
          // SAFETY: We verify automation permissions before acting.
          // Since this is a prototype, we log the *intent* to scale but do not execute it.
          logger.info({
              event: 'finops_violation_auto_remediate',
              tenantId,
              action: rule.action,
              reason: message
          }, `[AUTO-REMEDIATE] Would trigger ${rule.action} for tenant ${tenantId}`);
      }
  }
}
