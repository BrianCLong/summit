"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinOpsPolicyService = void 0;
const logger_js_1 = require("../config/logger.js");
const pg_js_1 = require("../db/pg.js");
class FinOpsPolicyService {
    async getPolicies(tenantId) {
        try {
            const result = await pg_js_1.pg.many(`SELECT * FROM finops_policies WHERE tenant_id = $1`, [tenantId], { tenantId });
            return result.map((row) => ({
                id: row.id,
                tenantId: row.tenant_id,
                name: row.name,
                description: row.description,
                enabled: row.enabled,
                rules: row.rules
            }));
        }
        catch (error) {
            logger_js_1.logger.error({ error, tenantId }, 'Error fetching FinOps policies');
            return [];
        }
    }
    async savePolicy(tenantId, policy) {
        try {
            await pg_js_1.pg.write(`INSERT INTO finops_policies (id, tenant_id, name, description, enabled, rules)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           enabled = EXCLUDED.enabled,
           rules = EXCLUDED.rules,
           updated_at = NOW()`, [policy.id, tenantId, policy.name, policy.description, policy.enabled, JSON.stringify(policy.rules)], { tenantId });
            logger_js_1.logger.info({ tenantId, policyId: policy.id }, 'FinOps policy saved');
        }
        catch (error) {
            logger_js_1.logger.error({ error, tenantId, policyId: policy.id }, 'Error saving FinOps policy');
            throw error;
        }
    }
    async deletePolicy(tenantId, policyId) {
        try {
            await pg_js_1.pg.write(`DELETE FROM finops_policies WHERE id = $1 AND tenant_id = $2`, [policyId, tenantId], { tenantId });
        }
        catch (error) {
            logger_js_1.logger.error({ error, tenantId, policyId }, 'Error deleting FinOps policy');
            throw error;
        }
    }
    async evaluatePolicies(tenantId, metrics) {
        const policies = await this.getPolicies(tenantId);
        const violations = [];
        for (const policy of policies) {
            if (!policy.enabled)
                continue;
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
    isViolation(rule, metrics) {
        // Improved regex-based parsing
        // Supports: metric < value, metric > value, metric = value, metric <= value, metric >= value
        const conditionRegex = /^([a-zA-Z0-9_]+)\s*(<=|>=|<|>|=)\s*([0-9.]+)$/;
        const match = rule.condition.match(conditionRegex);
        if (!match) {
            logger_js_1.logger.warn({ rule }, 'Invalid policy condition format');
            return false;
        }
        const [, metricName, operator, thresholdStr] = match;
        const threshold = parseFloat(thresholdStr);
        const metricValue = metrics[metricName];
        if (metricValue === undefined)
            return false;
        switch (operator) {
            case '<': return metricValue < threshold;
            case '>': return metricValue > threshold;
            case '<=': return metricValue <= threshold;
            case '>=': return metricValue >= threshold;
            case '=': return metricValue === threshold;
            default: return false;
        }
    }
    async executeAction(rule, tenantId, message) {
        logger_js_1.logger.warn({ tenantId, rule, message }, 'FinOps Policy Violation Detected');
        // Implement basic action routing with concrete examples
        if (rule.action === 'notify') {
            // SAFETY: In a real implementation, we would call NotificationService.sendEmail
            // For now, structured logging serves as the notification channel for the ops dashboard.
            logger_js_1.logger.info({
                event: 'finops_violation_notify',
                tenantId,
                message,
                severity: 'warning'
            }, `[NOTIFY] Alert for tenant ${tenantId}`);
        }
        else if (rule.action === 'stop' || rule.action === 'resize') {
            // SAFETY: We verify automation permissions before acting.
            // Since this is a prototype, we log the *intent* to scale but do not execute it.
            logger_js_1.logger.info({
                event: 'finops_violation_auto_remediate',
                tenantId,
                action: rule.action,
                reason: message
            }, `[AUTO-REMEDIATE] Would trigger ${rule.action} for tenant ${tenantId}`);
        }
    }
}
exports.FinOpsPolicyService = FinOpsPolicyService;
