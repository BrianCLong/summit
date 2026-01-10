
import { getPostgresPool } from '../../db/postgres.js';
import { GovernancePolicy, PolicyRule, PolicyAction, DataAsset } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export class PolicyEngine {
  private static instance: PolicyEngine;

  private constructor() { }

  static getInstance(): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  async createPolicy(policy: Omit<GovernancePolicy, 'id'>): Promise<GovernancePolicy> {
    const pool = getPostgresPool();
    const id = uuidv4();
    const newPolicy: GovernancePolicy = { ...policy, id };

    await pool.query(
      `INSERT INTO data_governance_policies (
        id, name, description, rules, actions, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newPolicy.id,
        newPolicy.name,
        newPolicy.description,
        JSON.stringify(newPolicy.rules),
        JSON.stringify(newPolicy.actions),
        newPolicy.tenantId,
      ]
    );

    return newPolicy;
  }

  async evaluateAsset(asset: DataAsset): Promise<{ compliant: boolean; violations: string[] }> {
    const pool = getPostgresPool();
    // Fetch all policies for this tenant
    const res = await pool.query('SELECT * FROM data_governance_policies WHERE tenant_id = $1', [asset.tenantId]);
    const policies: GovernancePolicy[] = res.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      rules: row.rules as PolicyRule[],
      actions: row.actions as PolicyAction[],
      tenantId: row.tenant_id
    }));

    const violations: string[] = [];

    for (const policy of policies) {
      if (!this.checkPolicy(asset, policy)) {
        violations.push(`Violated Policy: ${policy.name}`);
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  private checkPolicy(asset: DataAsset, policy: GovernancePolicy): boolean {
    // Logic: A policy passes if ALL its rules pass.
    // Example rule: field="sensitivity", operator="equals", value="public"
    // If asset.sensitivity is "confidential", check fails.

    // But usually policies are "IF condition THEN must comply".
    // Simplified: "All assets must have an owner".
    // rule: { field: "owners", operator: "exists", value: null }

    for (const rule of policy.rules) {
      const assetValue = (asset as any)[rule.field];

      switch (rule.operator) {
        case 'equals':
          if (assetValue !== rule.value) return false;
          break;
        case 'contains':
          if (Array.isArray(assetValue)) {
            if (!assetValue.includes(rule.value)) return false;
          } else if (typeof assetValue === 'string') {
            if (!assetValue.includes(rule.value)) return false;
          }
          break;
        case 'exists':
          if (assetValue === undefined || assetValue === null) return false;
          if (Array.isArray(assetValue) && assetValue.length === 0) return false;
          break;
      }
    }
    return true;
  }
}
