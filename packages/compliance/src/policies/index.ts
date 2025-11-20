/**
 * Policy Engine with Violation Detection
 * Automated policy enforcement and remediation
 */

import { Pool } from 'pg';
import { SecurityPolicy, PolicyRule, PolicyViolation } from '../types.js';
import { randomUUID } from 'node:crypto';

export class PolicyEngine {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize policy engine tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS security_policies (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          description TEXT,
          framework VARCHAR(50) NOT NULL,
          control_ids JSONB DEFAULT '[]',
          rules JSONB NOT NULL,
          effective_date TIMESTAMPTZ NOT NULL,
          expiry_date TIMESTAMPTZ,
          approved_by VARCHAR(255) NOT NULL,
          approved_at TIMESTAMPTZ NOT NULL,
          status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'active', 'deprecated')),
          enforcement_level VARCHAR(20) NOT NULL CHECK (enforcement_level IN ('advisory', 'warning', 'blocking')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS policy_violations (
          id VARCHAR(255) PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL,
          policy_id VARCHAR(255) NOT NULL,
          policy_name VARCHAR(255) NOT NULL,
          severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          user_id VARCHAR(255),
          resource VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          detected_by VARCHAR(20) NOT NULL CHECK (detected_by IN ('automatic', 'manual')),
          status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
          remediation_action TEXT,
          remediated_by VARCHAR(255),
          remediated_at TIMESTAMPTZ,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_policy_violations_status ON policy_violations(status);
        CREATE INDEX IF NOT EXISTS idx_policy_violations_severity ON policy_violations(severity);
        CREATE INDEX IF NOT EXISTS idx_policy_violations_timestamp ON policy_violations(timestamp DESC);
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Evaluate policy rules against an action
   */
  async evaluatePolicy(
    userId: string,
    resource: string,
    action: string,
    context: Record<string, unknown>
  ): Promise<{
    allowed: boolean;
    violations: PolicyViolation[];
    warnings: string[];
  }> {
    const violations: PolicyViolation[] = [];
    const warnings: string[] = [];

    // Get active policies
    const policies = await this.getActivePolicies();

    for (const policy of policies) {
      for (const rule of policy.rules) {
        const violated = this.evaluateRule(rule, context);

        if (violated) {
          const violation: PolicyViolation = {
            id: randomUUID(),
            timestamp: new Date(),
            policyId: policy.id,
            policyName: policy.name,
            severity: rule.severity,
            userId,
            resource,
            description: `Policy violation: ${policy.name}`,
            detectedBy: 'automatic',
            status: 'open',
          };

          if (rule.action === 'deny') {
            violations.push(violation);
            await this.recordViolation(violation);
          } else if (rule.action === 'alert') {
            warnings.push(`Warning: ${policy.name} - ${rule.condition}`);
          }

          // Auto-remediate if configured
          if (rule.autoRemediate && rule.remediationScript) {
            await this.executeRemediation(rule.remediationScript, context);
          }
        }
      }
    }

    const allowed = violations.length === 0 ||
                   !violations.some(v => v.severity === 'critical' || v.severity === 'high');

    return { allowed, violations, warnings };
  }

  private evaluateRule(rule: PolicyRule, context: Record<string, unknown>): boolean {
    // Simple expression evaluation (in production, use a safe expression evaluator)
    try {
      // This is a simplified example - in production use a proper expression engine
      return false;
    } catch {
      return false;
    }
  }

  private async executeRemediation(script: string, context: Record<string, unknown>): Promise<void> {
    // Execute remediation action (implement based on requirements)
    console.log(`Executing remediation: ${script}`);
  }

  private async getActivePolicies(): Promise<SecurityPolicy[]> {
    const result = await this.pool.query(
      `SELECT * FROM security_policies
       WHERE status = 'active'
       AND effective_date <= NOW()
       AND (expiry_date IS NULL OR expiry_date > NOW())`
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      framework: row.framework,
      controlIds: row.control_ids || [],
      rules: row.rules || [],
      effectiveDate: row.effective_date,
      expiryDate: row.expiry_date,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      status: row.status,
      enforcementLevel: row.enforcement_level,
    }));
  }

  private async recordViolation(violation: PolicyViolation): Promise<void> {
    await this.pool.query(
      `INSERT INTO policy_violations
       (id, timestamp, policy_id, policy_name, severity, user_id, resource,
        description, detected_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        violation.id,
        violation.timestamp,
        violation.policyId,
        violation.policyName,
        violation.severity,
        violation.userId,
        violation.resource,
        violation.description,
        violation.detectedBy,
        violation.status,
      ]
    );
  }
}

export * from './retention.js';
