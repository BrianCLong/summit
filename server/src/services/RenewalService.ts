import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

interface ContractTerm {
    id: string;
    tenantId: string;
    startDate: Date;
    endDate: Date;
    autoRenew: boolean;
    termLengthMonths: number;
    cancellationNoticePeriodDays: number;
}

interface UsageForecast {
    id: string;
    tenantId: string;
    forecastDate: Date;
    periodStart: Date;
    periodEnd: Date;
    projectedAmount: number;
    confidenceScore: number;
    lineItems: any[];
}

export class RenewalService {
    private static instance: RenewalService;
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

    public static getInstance(): RenewalService {
        if (!RenewalService.instance) {
            RenewalService.instance = new RenewalService();
        }
        return RenewalService.instance;
    }

    /**
     * Checks for contracts ending within the specified window and processes notices/forecasts.
     */
    async processRenewals() {
        logger.info('Starting renewal processing...');
        const client = await this.pool.connect();
        try {
            // Find contracts ending in 90, 60, 30 days
            const windows = [90, 60, 30];

            for (const days of windows) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + days);

                // Query for contracts ending on targetDate (approximate for daily run)
                // We use a range for the day
                const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

                const res = await client.query(
                    `SELECT * FROM contract_terms
                     WHERE end_date >= $1 AND end_date <= $2
                     AND auto_renew = TRUE`, // Focus on auto-renew first, or all? Prompt says "notices".
                    [startOfDay, endOfDay]
                );

                for (const row of res.rows) {
                    await this.handleRenewalNotice(client, row, days);
                }
            }
        } catch (error: any) {
            logger.error('Error processing renewals:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    private async handleRenewalNotice(client: any, contract: any, daysRemaining: number) {
        // Check if notice already sent
        const eventType = `NOTICE_${daysRemaining}_DAYS`;
        const existing = await client.query(
            `SELECT 1 FROM renewal_events
             WHERE contract_id = $1 AND event_type = $2`,
            [contract.id, eventType]
        );

        if (existing.rows.length > 0) return;

        logger.info(`Sending ${daysRemaining}-day renewal notice for tenant ${contract.tenant_id}`);

        // Generate Forecast
        const forecast = await this.generateUsageForecast(contract.tenant_id);

        // TODO: Trigger Notification (Email/Webhook)
        // await NotificationService.send(...)

        // Record Event
        await client.query(
            `INSERT INTO renewal_events (contract_id, tenant_id, event_type, details)
             VALUES ($1, $2, $3, $4)`,
            [contract.id, contract.tenant_id, eventType, JSON.stringify({ daysRemaining, forecastId: forecast.id })]
        );
    }

    async generateUsageForecast(tenantId: string): Promise<UsageForecast> {
        // Placeholder for forecast logic
        // In a real implementation, this would look at historical usage trends.
        logger.warn(`[Renewal] Using stubbed forecast calculation for tenant ${tenantId}`);
        const projectedAmount = 0.00; // Safe default
        const confidenceScore = 0.00;

        const forecast: UsageForecast = {
            id: randomUUID(),
            tenantId,
            forecastDate: new Date(),
            periodStart: new Date(), // Next billing cycle start
            periodEnd: new Date(),   // Next billing cycle end
            projectedAmount,
            confidenceScore,
            lineItems: []
        };

        const client = await this.pool.connect();
        try {
            await client.query(
                `INSERT INTO usage_forecasts (id, tenant_id, forecast_date, period_start, period_end, projected_amount, confidence_score, line_items)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [forecast.id, forecast.tenantId, forecast.forecastDate, forecast.periodStart, forecast.periodEnd, forecast.projectedAmount, forecast.confidenceScore, JSON.stringify(forecast.lineItems)]
            );
            return forecast;
        } finally {
            client.release();
        }
    }
}

export default RenewalService.getInstance();
