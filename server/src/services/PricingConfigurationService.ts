import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

interface PricingRule {
    tier: string;
    threshold: number;
    unitPrice: number;
    overagePrice: number;
}

interface BillShockCap {
    id: string;
    tenantId: string;
    capAmount: number;
    action: 'ALERT' | 'THROTTLE' | 'BLOCK';
    thresholdPercent: number;
}

export class PricingConfigurationService {
    private static instance: PricingConfigurationService;
    private pool: Pool;

    private constructor() {
        this.pool = getPostgresPool();
    }

    public static getInstance(): PricingConfigurationService {
        if (!PricingConfigurationService.instance) {
            PricingConfigurationService.instance = new PricingConfigurationService();
        }
        return PricingConfigurationService.instance;
    }

    async getEffectiveRules(tenantId: string): Promise<PricingRule[]> {
        const client = await this.pool.connect();
        try {
            // Check for tenant override first
            const res = await client.query(
                `SELECT rules FROM pricing_rule_versions
                 WHERE tenant_id = $1
                 ORDER BY version DESC LIMIT 1`,
                [tenantId]
            );

            if (res.rows.length > 0) return res.rows[0].rules;

            // Fallback to global
            const globalRes = await client.query(
                `SELECT rules FROM pricing_rule_versions
                 WHERE tenant_id IS NULL
                 ORDER BY version DESC LIMIT 1`
            );

            return globalRes.rows.length > 0 ? globalRes.rows[0].rules : [];
        } finally {
            client.release();
        }
    }

    async setPricingRules(rules: PricingRule[], tenantId?: string, approvedBy?: string): Promise<string> {
        const client = await this.pool.connect();
        try {
            const lastVerRes = await client.query(
                `SELECT version FROM pricing_rule_versions
                 WHERE tenant_id ${tenantId ? '= $1' : 'IS NULL'}
                 ORDER BY version DESC LIMIT 1`,
                tenantId ? [tenantId] : []
            );

            const nextVersion = (lastVerRes.rows[0]?.version || 0) + 1;
            const id = randomUUID();

            await client.query(
                `INSERT INTO pricing_rule_versions (id, tenant_id, version, rules, approved_by)
                 VALUES ($1, $2, $3, $4, $5)`,
                [id, tenantId, nextVersion, JSON.stringify(rules), approvedBy]
            );

            return id;
        } finally {
            client.release();
        }
    }

    async getBillShockCap(tenantId: string): Promise<BillShockCap | null> {
        const client = await this.pool.connect();
        try {
            const res = await client.query(
                `SELECT * FROM bill_shock_caps WHERE tenant_id = $1`,
                [tenantId]
            );
            if (res.rows.length === 0) return null;

            const row = res.rows[0];
            return {
                id: row.id,
                tenantId: row.tenant_id,
                capAmount: parseFloat(row.cap_amount),
                action: row.action,
                thresholdPercent: row.threshold_percent
            };
        } finally {
            client.release();
        }
    }

    async setBillShockCap(cap: Omit<BillShockCap, 'id'>): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Delete existing cap for this tenant to simulate UPSERT
            await client.query('DELETE FROM bill_shock_caps WHERE tenant_id = $1', [cap.tenantId]);
            await client.query(
                `INSERT INTO bill_shock_caps (tenant_id, cap_amount, action, threshold_percent)
                 VALUES ($1, $2, $3, $4)`,
                [cap.tenantId, cap.capAmount, cap.action, cap.thresholdPercent]
            );
            await client.query('COMMIT');
        } catch (e: any) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

export default PricingConfigurationService.getInstance();
