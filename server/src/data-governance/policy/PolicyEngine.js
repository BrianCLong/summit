"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const postgres_js_1 = require("../../db/postgres.js");
const uuid_1 = require("uuid");
class PolicyEngine {
    static instance;
    constructor() { }
    static getInstance() {
        if (!PolicyEngine.instance) {
            PolicyEngine.instance = new PolicyEngine();
        }
        return PolicyEngine.instance;
    }
    async createPolicy(policy) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const id = (0, uuid_1.v4)();
        const newPolicy = { ...policy, id };
        await pool.query(`INSERT INTO data_governance_policies (
        id, name, description, rules, actions, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`, [
            newPolicy.id,
            newPolicy.name,
            newPolicy.description,
            JSON.stringify(newPolicy.rules),
            JSON.stringify(newPolicy.actions),
            newPolicy.tenantId,
        ]);
        return newPolicy;
    }
    async evaluateAsset(asset) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        // Fetch all policies for this tenant
        const res = await pool.query('SELECT * FROM data_governance_policies WHERE tenant_id = $1', [asset.tenantId]);
        const policies = res.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            rules: row.rules,
            actions: row.actions,
            tenantId: row.tenant_id
        }));
        const violations = [];
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
    checkPolicy(asset, policy) {
        // Logic: A policy passes if ALL its rules pass.
        // Example rule: field="sensitivity", operator="equals", value="public"
        // If asset.sensitivity is "confidential", check fails.
        // But usually policies are "IF condition THEN must comply".
        // Simplified: "All assets must have an owner".
        // rule: { field: "owners", operator: "exists", value: null }
        for (const rule of policy.rules) {
            const assetValue = asset[rule.field];
            switch (rule.operator) {
                case 'equals':
                    if (assetValue !== rule.value)
                        return false;
                    break;
                case 'contains':
                    if (Array.isArray(assetValue)) {
                        if (!assetValue.includes(rule.value))
                            return false;
                    }
                    else if (typeof assetValue === 'string') {
                        if (!assetValue.includes(rule.value))
                            return false;
                    }
                    break;
                case 'exists':
                    if (assetValue === undefined || assetValue === null)
                        return false;
                    if (Array.isArray(assetValue) && assetValue.length === 0)
                        return false;
                    break;
            }
        }
        return true;
    }
}
exports.PolicyEngine = PolicyEngine;
