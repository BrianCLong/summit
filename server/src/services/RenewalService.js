"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenewalService = void 0;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const crypto_1 = require("crypto");
class RenewalService {
    static instance;
    _pool;
    constructor() {
        // Lazy initialization
    }
    get pool() {
        if (!this._pool) {
            this._pool = (0, database_js_1.getPostgresPool)();
        }
        return this._pool;
    }
    static getInstance() {
        if (!RenewalService.instance) {
            RenewalService.instance = new RenewalService();
        }
        return RenewalService.instance;
    }
    /**
     * Checks for contracts ending within the specified window and processes notices/forecasts.
     */
    async processRenewals() {
        logger_js_1.default.info('Starting renewal processing...');
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
                const res = await client.query(`SELECT * FROM contract_terms
                     WHERE end_date >= $1 AND end_date <= $2
                     AND auto_renew = TRUE`, // Focus on auto-renew first, or all? Prompt says "notices".
                [startOfDay, endOfDay]);
                for (const row of res.rows) {
                    await this.handleRenewalNotice(client, row, days);
                }
            }
        }
        catch (error) {
            logger_js_1.default.error('Error processing renewals:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async handleRenewalNotice(client, contract, daysRemaining) {
        // Check if notice already sent
        const eventType = `NOTICE_${daysRemaining}_DAYS`;
        const existing = await client.query(`SELECT 1 FROM renewal_events
             WHERE contract_id = $1 AND event_type = $2`, [contract.id, eventType]);
        if (existing.rows.length > 0)
            return;
        logger_js_1.default.info(`Sending ${daysRemaining}-day renewal notice for tenant ${contract.tenant_id}`);
        // Generate Forecast
        const forecast = await this.generateUsageForecast(contract.tenant_id);
        // TODO: Trigger Notification (Email/Webhook)
        // await NotificationService.send(...)
        // Record Event
        await client.query(`INSERT INTO renewal_events (contract_id, tenant_id, event_type, details)
             VALUES ($1, $2, $3, $4)`, [contract.id, contract.tenant_id, eventType, JSON.stringify({ daysRemaining, forecastId: forecast.id })]);
    }
    async generateUsageForecast(tenantId) {
        // Placeholder for forecast logic
        // In a real implementation, this would look at historical usage trends.
        logger_js_1.default.warn(`[Renewal] Using stubbed forecast calculation for tenant ${tenantId}`);
        const projectedAmount = 0.00; // Safe default
        const confidenceScore = 0.00;
        const forecast = {
            id: (0, crypto_1.randomUUID)(),
            tenantId,
            forecastDate: new Date(),
            periodStart: new Date(), // Next billing cycle start
            periodEnd: new Date(), // Next billing cycle end
            projectedAmount,
            confidenceScore,
            lineItems: []
        };
        const client = await this.pool.connect();
        try {
            await client.query(`INSERT INTO usage_forecasts (id, tenant_id, forecast_date, period_start, period_end, projected_amount, confidence_score, line_items)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [forecast.id, forecast.tenantId, forecast.forecastDate, forecast.periodStart, forecast.periodEnd, forecast.projectedAmount, forecast.confidenceScore, JSON.stringify(forecast.lineItems)]);
            return forecast;
        }
        finally {
            client.release();
        }
    }
}
exports.RenewalService = RenewalService;
exports.default = RenewalService.getInstance();
