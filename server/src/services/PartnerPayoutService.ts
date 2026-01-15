import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

interface PartnerPayoutReport {
    id: string;
    partnerId: string;
    periodStart: Date;
    periodEnd: Date;
    totalAmount: number;
    status: 'DRAFT' | 'APPROVED' | 'PAID';
}

export class PartnerPayoutService {
    private static instance: PartnerPayoutService;
    private _pool?: Pool;

    private constructor() {
        // Lazy initialization
    }

    private get pool(): Pool {
        if (!this._pool) {
            this._pool = getPostgresPool();
        }
        return this._pool;
    }

    public static getInstance(): PartnerPayoutService {
        if (!PartnerPayoutService.instance) {
            PartnerPayoutService.instance = new PartnerPayoutService();
        }
        return PartnerPayoutService.instance;
    }

    async generatePayoutReports(periodStart: Date, periodEnd: Date) {
        logger.info(`Generating partner payout reports for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
        const client = await this.pool.connect();
        try {
            // Find all active partners (tenants with partner profiles)
            const res = await client.query(
                `SELECT tenant_id FROM partner_profiles`
            );

            if (res.rows.length === 0) {
                logger.warn('No partners found for payout generation.');
                return;
            }

            const partners = res.rows.map((r: any) => r.tenant_id);

            for (const partnerId of partners) {
                await this.generateReportForPartner(client, partnerId, periodStart, periodEnd);
            }
        } finally {
            client.release();
        }
    }

    private async generateReportForPartner(client: any, partnerId: string, periodStart: Date, periodEnd: Date) {
        // Mock: Calculate usage for artifacts owned by this partner
        // In reality, join usage_summaries with marketplace_artifacts where owner = partnerId
        logger.warn(`[PartnerPayout] Using stubbed payout calculation for partner ${partnerId}`);
        const totalAmount = 0.00; // Safe default for V1 skeleton

        const reportId = randomUUID();

        await client.query(
            `INSERT INTO partner_payout_reports (id, partner_id, period_start, period_end, total_amount, status)
             VALUES ($1, $2, $3, $4, $5, 'DRAFT')`,
            [reportId, partnerId, periodStart, periodEnd, totalAmount]
        );

        // Insert line items
        // await client.query(...)
    }
}

export default PartnerPayoutService.getInstance();
