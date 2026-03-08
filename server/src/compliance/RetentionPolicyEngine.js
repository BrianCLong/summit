"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionPolicyEngine = exports.TimeBasedRetentionStrategy = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
class TimeBasedRetentionStrategy {
    shouldRetain(item, policy) {
        const ageInMs = new Date().getTime() - new Date(item.createdAt).getTime();
        const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
        return ageInDays <= policy.retentionDays;
    }
}
exports.TimeBasedRetentionStrategy = TimeBasedRetentionStrategy;
class RetentionPolicyEngine {
    static instance;
    pool;
    strategies;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
        this.strategies = new Map();
        this.registerStrategy('TIME_BASED', new TimeBasedRetentionStrategy());
    }
    static getInstance() {
        if (!RetentionPolicyEngine.instance) {
            RetentionPolicyEngine.instance = new RetentionPolicyEngine();
        }
        return RetentionPolicyEngine.instance;
    }
    registerStrategy(name, strategy) {
        this.strategies.set(name, strategy);
    }
    async createPolicy(targetType, retentionDays, action) {
        const id = (0, crypto_1.randomUUID)();
        await this.pool.query(`INSERT INTO retention_policies (id, target_type, retention_days, action) VALUES ($1, $2, $3, $4)`, [id, targetType, retentionDays, action]);
        return id;
    }
    /**
     * Run retention checks.
     * Note: This assumes generic "target_type" maps to a table name or known entity.
     * For this implementation, we'll support 'provenance_ledger_v2' and 'audit_events' specifically.
     */
    async enforcePolicies() {
        const policies = await this.pool.query(`SELECT * FROM retention_policies WHERE is_active = TRUE`);
        for (const row of policies.rows) {
            const policy = {
                id: row.id,
                targetType: row.target_type,
                retentionDays: row.retention_days,
                action: row.action,
                isActive: row.is_active
            };
            await this.applyPolicy(policy);
        }
    }
    async getRetentionRules(tenantId, type) {
        // For MVP, we ignore tenantId filtering for global policies, but could add it.
        const policies = await this.pool.query(`SELECT * FROM retention_policies WHERE is_active = TRUE`);
        return policies.rows.map((row) => ({
            id: row.id,
            targetType: row.target_type,
            retentionDays: row.retention_days,
            action: row.action,
            isActive: row.is_active
        }));
    }
    async applyPolicy(policy) {
        console.log(`Applying retention policy for ${policy.targetType}: ${policy.action} older than ${policy.retentionDays} days`);
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
        let tableName = '';
        let dateColumn = 'created_at'; // Default
        if (policy.targetType === 'audit_logs') {
            // Assuming audit logs are in a table or managed by WORM service.
            // If managed by WORM, we might need to call WORM service.
            // For this MVP, we assume a hypothetical table or skip if not directly accessible via SQL.
            console.warn('Audit log retention requiring WORM storage interface - skipping SQL delete');
            return;
        }
        else if (policy.targetType === 'audit_events') {
            tableName = 'audit_events';
            dateColumn = 'timestamp';
        }
        else if (policy.targetType === 'provenance_entries') {
            tableName = 'provenance_ledger_v2';
            dateColumn = 'timestamp';
        }
        else {
            console.warn(`Unknown target type for retention: ${policy.targetType}`);
            return;
        }
        if (tableName) {
            if (tableName) {
                if (policy.action === 'DELETE') {
                    const res = await this.pool.query(`DELETE FROM ${tableName} WHERE ${dateColumn} < $1`, [cutoffDate]);
                    console.log(`Deleted ${res.rowCount} rows from ${tableName}`);
                }
                else if (policy.action === 'ARCHIVE') {
                    // Implement archive logic (e.g. move to cold storage table or export to S3)
                    console.log(`Archiving not yet implemented for ${tableName}`);
                }
            }
        }
    }
}
exports.RetentionPolicyEngine = RetentionPolicyEngine;
