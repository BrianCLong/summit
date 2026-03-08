"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEvaluator = void 0;
const pino_1 = __importDefault(require("pino"));
const repository_js_1 = require("./repository.js");
/**
 * Policy Evaluation Engine
 *
 * Computes effective retention and redaction policies for resources
 * based on data classification, jurisdiction, compliance requirements,
 * and legal hold status.
 */
class PolicyEvaluator {
    logger = pino_1.default({ name: 'policy-evaluator' });
    repository;
    pool;
    // In-memory policy cache
    redactionPolicies = new Map();
    constructor(options) {
        this.pool = options.pool;
        this.repository =
            options.repository ?? new repository_js_1.DataRetentionRepository(options.pool);
    }
    /**
     * Get effective policy for a resource
     *
     * This is the main API for other services to query what retention
     * and redaction rules apply to a specific resource.
     */
    async getEffectivePolicy(resource, context) {
        const evaluationTime = context.evaluationTime ?? new Date();
        // Step 1: Get retention policy for the resource
        const retentionRecord = this.getRetentionRecord(resource);
        // Step 2: Evaluate applicable redaction policies
        const redactionPolicies = await this.evaluateRedactionPolicies(resource, context);
        // Step 3: Check for legal hold
        const legalHold = retentionRecord?.legalHold;
        const legalHoldActive = this.isLegalHoldActive(legalHold);
        // Step 4: Compute retention schedule
        const retention = this.computeRetentionSchedule(retentionRecord);
        // Step 5: Collect warnings
        const warnings = [];
        if (legalHoldActive) {
            warnings.push('Legal hold is active - deletion and redaction are blocked');
        }
        if (redactionPolicies.policies.length > 1) {
            warnings.push(`Multiple redaction policies apply (${redactionPolicies.policies.length})`);
        }
        // Step 6: Build applied policies list
        const appliedPolicies = [];
        if (retentionRecord) {
            appliedPolicies.push({
                policyId: retentionRecord.policy.templateId,
                policyName: retentionRecord.policy.templateId,
                priority: 100,
                reason: 'Retention policy',
            });
        }
        for (const policy of redactionPolicies.policies) {
            appliedPolicies.push({
                policyId: policy.id,
                policyName: policy.name,
                priority: policy.priority,
                reason: 'Redaction policy',
            });
        }
        return {
            retention,
            redaction: redactionPolicies,
            legalHold: legalHoldActive
                ? {
                    active: true,
                    reason: legalHold?.reason,
                    expiresAt: legalHold?.expiresAt,
                }
                : undefined,
            appliedPolicies,
            warnings: warnings.length > 0 ? warnings : undefined,
            evaluatedAt: evaluationTime,
        };
    }
    /**
     * Register a redaction policy
     */
    async registerRedactionPolicy(policy) {
        this.redactionPolicies.set(policy.id, policy);
        await this.persistRedactionPolicy(policy);
        this.logger.info({ policyId: policy.id, policyName: policy.name }, 'Registered redaction policy');
    }
    /**
     * Get redaction policy by ID
     */
    getRedactionPolicy(policyId) {
        return this.redactionPolicies.get(policyId);
    }
    /**
     * List all redaction policies
     */
    listRedactionPolicies() {
        return Array.from(this.redactionPolicies.values());
    }
    /**
     * Update redaction policy
     */
    async updateRedactionPolicy(policyId, updates) {
        const existing = this.redactionPolicies.get(policyId);
        if (!existing) {
            throw new Error(`Redaction policy ${policyId} not found`);
        }
        const updated = {
            ...existing,
            ...updates,
            id: policyId, // Ensure ID doesn't change
            updatedAt: new Date(),
        };
        this.redactionPolicies.set(policyId, updated);
        await this.persistRedactionPolicy(updated);
        this.logger.info({ policyId }, 'Updated redaction policy');
        return updated;
    }
    /**
     * Delete redaction policy
     */
    async deleteRedactionPolicy(policyId) {
        this.redactionPolicies.delete(policyId);
        await this.deletePersistedRedactionPolicy(policyId);
        this.logger.info({ policyId }, 'Deleted redaction policy');
    }
    /**
     * Load redaction policies from database
     */
    async loadRedactionPolicies() {
        try {
            const result = await this.pool.query('SELECT * FROM redaction_policies WHERE enabled = true');
            for (const row of result.rows) {
                const policy = {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    enabled: row.enabled,
                    triggers: row.triggers,
                    rules: row.rules,
                    priority: row.priority,
                    createdAt: row.created_at,
                    createdBy: row.created_by,
                    updatedAt: row.updated_at,
                    updatedBy: row.updated_by,
                };
                this.redactionPolicies.set(policy.id, policy);
            }
            this.logger.info({ count: this.redactionPolicies.size }, 'Loaded redaction policies');
        }
        catch (error) {
            if (error.code === '42P01') {
                this.logger.debug('Redaction policies table does not exist');
            }
            else {
                this.logger.error({ error }, 'Failed to load redaction policies');
            }
        }
    }
    /**
     * Get retention record for resource
     */
    getRetentionRecord(resource) {
        // For datasets, we can look up directly
        if (resource.resourceType === 'dataset') {
            return this.repository.getRecord(resource.resourceId);
        }
        // For other types, we'd need to map to dataset
        // This is a simplified implementation
        const allRecords = this.repository.getAllRecords();
        return allRecords.find((record) => this.resourceMatchesRecord(resource, record));
    }
    /**
     * Check if resource matches retention record
     */
    resourceMatchesRecord(resource, record) {
        // Check if resource tags or metadata match dataset tags
        const resourceTags = resource.metadata?.tags ?? [];
        const recordTags = record.metadata.tags;
        return resourceTags.some((tag) => recordTags.includes(tag));
    }
    /**
     * Evaluate applicable redaction policies
     */
    async evaluateRedactionPolicies(resource, context) {
        const applicablePolicies = [];
        const applicableRules = [];
        for (const policy of this.redactionPolicies.values()) {
            if (!policy.enabled) {
                continue;
            }
            if (this.policyApplies(policy, resource, context)) {
                applicablePolicies.push(policy);
                // Collect rules that apply to this resource's storage systems
                for (const rule of policy.rules) {
                    if (this.ruleApplies(rule, resource)) {
                        applicableRules.push(rule);
                    }
                }
            }
        }
        // Sort by priority (higher priority first)
        applicablePolicies.sort((a, b) => b.priority - a.priority);
        return {
            policies: applicablePolicies,
            rules: applicableRules,
        };
    }
    /**
     * Check if policy applies to resource
     */
    policyApplies(policy, resource, context) {
        const triggers = policy.triggers;
        // Check data classification
        if (triggers.dataClassification &&
            triggers.dataClassification.length > 0) {
            const resourceClassification = context.dataClassification;
            if (!resourceClassification ||
                !triggers.dataClassification.includes(resourceClassification)) {
                return false;
            }
        }
        // Check jurisdictions
        if (triggers.jurisdictions && triggers.jurisdictions.length > 0) {
            const contextJurisdictions = context.jurisdictions ?? [];
            if (!triggers.jurisdictions.some((j) => contextJurisdictions.includes(j))) {
                return false;
            }
        }
        // Check tags
        if (triggers.tags && triggers.tags.length > 0) {
            const resourceTags = context.sensitivityTags ?? [];
            if (!triggers.tags.some((tag) => resourceTags.includes(tag))) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if rule applies to resource storage
     */
    ruleApplies(rule, resource) {
        // Check if resource's storage systems match rule's targets
        return resource.storageSystems.some((sys) => rule.storageTargets.includes(sys));
    }
    /**
     * Check if legal hold is active
     */
    isLegalHoldActive(legalHold) {
        if (!legalHold) {
            return false;
        }
        if (!legalHold.expiresAt) {
            return true; // No expiration = permanent hold
        }
        return legalHold.expiresAt > new Date();
    }
    /**
     * Compute retention schedule
     */
    computeRetentionSchedule(record) {
        if (!record) {
            return {
                retentionDays: 365, // Default 1 year
                purgeGraceDays: 30,
            };
        }
        const nextPurgeDate = record.schedule?.nextRun;
        return {
            retentionDays: record.policy.retentionDays,
            purgeGraceDays: record.policy.purgeGraceDays,
            nextPurgeDate,
        };
    }
    /**
     * Persist redaction policy to database
     */
    async persistRedactionPolicy(policy) {
        try {
            await this.pool.query(`INSERT INTO redaction_policies (
          id, name, description, enabled, triggers, rules, priority,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          enabled = EXCLUDED.enabled,
          triggers = EXCLUDED.triggers,
          rules = EXCLUDED.rules,
          priority = EXCLUDED.priority,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by`, [
                policy.id,
                policy.name,
                policy.description,
                policy.enabled,
                JSON.stringify(policy.triggers),
                JSON.stringify(policy.rules),
                policy.priority,
                policy.createdAt,
                policy.createdBy,
                policy.updatedAt,
                policy.updatedBy,
            ]);
        }
        catch (error) {
            if (error.code !== '42P01') {
                throw error;
            }
            this.logger.debug('Redaction policies table does not exist');
        }
    }
    /**
     * Delete persisted redaction policy
     */
    async deletePersistedRedactionPolicy(policyId) {
        try {
            await this.pool.query('DELETE FROM redaction_policies WHERE id = $1', [
                policyId,
            ]);
        }
        catch (error) {
            if (error.code !== '42P01') {
                throw error;
            }
        }
    }
}
exports.PolicyEvaluator = PolicyEvaluator;
