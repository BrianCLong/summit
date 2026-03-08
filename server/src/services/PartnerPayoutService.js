"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerPayoutService = void 0;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const crypto_1 = require("crypto");
class PartnerPayoutService {
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
        if (!PartnerPayoutService.instance) {
            PartnerPayoutService.instance = new PartnerPayoutService();
        }
        return PartnerPayoutService.instance;
    }
    async generatePayoutReports(periodStart, periodEnd) {
        logger_js_1.default.info(`Generating partner payout reports for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
        const client = await this.pool.connect();
        try {
            // Find all active partners (tenants with partner profiles)
            const res = await client.query(`SELECT tenant_id FROM partner_profiles`);
            if (res.rows.length === 0) {
                logger_js_1.default.warn('No partners found for payout generation.');
                return;
            }
            const partners = res.rows.map((r) => r.tenant_id);
            for (const partnerId of partners) {
                await this.generateReportForPartner(client, partnerId, periodStart, periodEnd);
            }
        }
        finally {
            client.release();
        }
    }
    async generateReportForPartner(client, partnerId, periodStart, periodEnd) {
        // Mock: Calculate usage for artifacts owned by this partner
        // In reality, join usage_summaries with marketplace_artifacts where owner = partnerId
        logger_js_1.default.warn(`[PartnerPayout] Using stubbed payout calculation for partner ${partnerId}`);
        const totalAmount = 0.00; // Safe default for V1 skeleton
        const reportId = (0, crypto_1.randomUUID)();
        await client.query(`INSERT INTO partner_payout_reports (id, partner_id, period_start, period_end, total_amount, status)
             VALUES ($1, $2, $3, $4, $5, 'DRAFT')`, [reportId, partnerId, periodStart, periodEnd, totalAmount]);
        // Insert line items
        // await client.query(...)
    }
}
exports.PartnerPayoutService = PartnerPayoutService;
exports.default = PartnerPayoutService.getInstance();
