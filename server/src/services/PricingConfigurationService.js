"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingConfigurationService = void 0;
const database_js_1 = require("../config/database.js");
const crypto_1 = require("crypto");
class PricingConfigurationService {
    static instance;
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    static getInstance() {
        if (!PricingConfigurationService.instance) {
            PricingConfigurationService.instance = new PricingConfigurationService();
        }
        return PricingConfigurationService.instance;
    }
    async getEffectiveRules(tenantId) {
        const client = await this.pool.connect();
        try {
            // Check for tenant override first
            const res = await client.query(`SELECT rules FROM pricing_rule_versions
                 WHERE tenant_id = $1
                 ORDER BY version DESC LIMIT 1`, [tenantId]);
            if (res.rows.length > 0)
                return res.rows[0].rules;
            // Fallback to global
            const globalRes = await client.query(`SELECT rules FROM pricing_rule_versions
                 WHERE tenant_id IS NULL
                 ORDER BY version DESC LIMIT 1`);
            return globalRes.rows.length > 0 ? globalRes.rows[0].rules : [];
        }
        finally {
            client.release();
        }
    }
    async setPricingRules(rules, tenantId, approvedBy) {
        const client = await this.pool.connect();
        try {
            const lastVerRes = await client.query(`SELECT version FROM pricing_rule_versions
                 WHERE tenant_id ${tenantId ? '= $1' : 'IS NULL'}
                 ORDER BY version DESC LIMIT 1`, tenantId ? [tenantId] : []);
            const nextVersion = (lastVerRes.rows[0]?.version || 0) + 1;
            const id = (0, crypto_1.randomUUID)();
            await client.query(`INSERT INTO pricing_rule_versions (id, tenant_id, version, rules, approved_by)
                 VALUES ($1, $2, $3, $4, $5)`, [id, tenantId, nextVersion, JSON.stringify(rules), approvedBy]);
            return id;
        }
        finally {
            client.release();
        }
    }
    async getBillShockCap(tenantId) {
        const client = await this.pool.connect();
        try {
            const res = await client.query(`SELECT * FROM bill_shock_caps WHERE tenant_id = $1`, [tenantId]);
            if (res.rows.length === 0)
                return null;
            const row = res.rows[0];
            return {
                id: row.id,
                tenantId: row.tenant_id,
                capAmount: parseFloat(row.cap_amount),
                action: row.action,
                thresholdPercent: row.threshold_percent
            };
        }
        finally {
            client.release();
        }
    }
    async setBillShockCap(cap) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Delete existing cap for this tenant to simulate UPSERT
            await client.query('DELETE FROM bill_shock_caps WHERE tenant_id = $1', [cap.tenantId]);
            await client.query(`INSERT INTO bill_shock_caps (tenant_id, cap_amount, action, threshold_percent)
                 VALUES ($1, $2, $3, $4)`, [cap.tenantId, cap.capAmount, cap.action, cap.thresholdPercent]);
            await client.query('COMMIT');
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
}
exports.PricingConfigurationService = PricingConfigurationService;
exports.default = PricingConfigurationService.getInstance();
