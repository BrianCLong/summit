"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionManager = void 0;
const postgres_js_1 = require("../db/postgres.js");
const policy_js_1 = require("./policy.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const evidence_js_1 = require("./evidence.js");
const logger = logger_js_1.default.child({ name: 'retention-manager' });
class RetentionManager {
    static instance;
    constructor() { }
    static getInstance() {
        if (!RetentionManager.instance) {
            RetentionManager.instance = new RetentionManager();
        }
        return RetentionManager.instance;
    }
    /**
     * Scans for expired data across all known tables and deletes it.
     * Returns a summary of deleted records.
     */
    async scanExpired() {
        const results = {
            OPERATIONAL_METADATA: 0,
            ANALYTICS_ARTIFACTS: 0,
            PREDICTIVE_MODELS: 0,
            AUDIT_RECORDS: 0,
            TENANT_DATA: 0,
        };
        const pool = (0, postgres_js_1.getPostgresPool)();
        for (const mapping of policy_js_1.TABLE_MAPPINGS) {
            const policy = policy_js_1.LIFECYCLE_POLICIES[mapping.category];
            if (!policy) {
                logger.warn({ category: mapping.category }, 'No policy found for category');
                continue;
            }
            if (policy.retention === 'infinity') {
                continue;
            }
            const retentionDays = (0, policy_js_1.getRetentionDays)(policy.retention);
            if (retentionDays <= 0)
                continue;
            // Calculate cutoff date
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - retentionDays);
            const tableName = mapping.schema ? `"${mapping.schema}"."${mapping.tableName}"` : `"${mapping.tableName}"`;
            // Check for Legal Holds
            let legalHoldClause = '';
            if (policy.legalHoldEligible && mapping.tenantColumn) {
                // Exclude data belonging to tenants under hold
                legalHoldClause = `AND ${mapping.tenantColumn} NOT IN (SELECT target_id FROM legal_holds WHERE status='active')`;
            }
            try {
                const query = `
          DELETE FROM ${tableName}
          WHERE ${mapping.timestampColumn} < $1
          ${legalHoldClause}
          RETURNING *
        `;
                const res = await pool.query(query, [cutoff]);
                const deletedCount = res.rowCount || 0;
                if (deletedCount > 0) {
                    logger.info({ table: tableName, count: deletedCount, category: mapping.category }, 'Expired records deleted');
                    results[mapping.category] += deletedCount;
                    // Log evidence
                    await evidence_js_1.LifecycleEvidence.getInstance().recordEvent('RETENTION_ENFORCED', 'system', { category: mapping.category, count: deletedCount, table: tableName });
                }
            }
            catch (err) {
                logger.error({ table: tableName, err }, 'Failed to clean up expired records');
            }
        }
        return results;
    }
}
exports.RetentionManager = RetentionManager;
