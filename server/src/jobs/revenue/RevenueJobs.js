"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_QUEUE_PARTNER_PAYOUTS = exports.JOB_QUEUE_RENEWALS = void 0;
exports.registerRevenueJobs = registerRevenueJobs;
const RenewalService_js_1 = __importDefault(require("../../services/RenewalService.js"));
const PartnerPayoutService_js_1 = __importDefault(require("../../services/PartnerPayoutService.js"));
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
exports.JOB_QUEUE_RENEWALS = 'process-renewals';
exports.JOB_QUEUE_PARTNER_PAYOUTS = 'process-partner-payouts';
async function registerRevenueJobs(boss) {
    // Renewals Job
    await boss.work(exports.JOB_QUEUE_RENEWALS, async (job) => {
        logger_js_1.default.info(`[Job] Processing renewals job ${job.id}`);
        try {
            await RenewalService_js_1.default.processRenewals();
        }
        catch (error) {
            logger_js_1.default.error(`[Job] Renewal processing failed: ${error}`);
            throw error;
        }
    });
    // Partner Payouts Job
    await boss.work(exports.JOB_QUEUE_PARTNER_PAYOUTS, async (job) => {
        logger_js_1.default.info(`[Job] Processing partner payouts job ${job.id}`);
        try {
            let { periodStart, periodEnd } = job.data || {};
            // Calculate default period (previous month) if missing
            if (!periodStart || !periodEnd) {
                const now = new Date();
                const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                periodStart = firstDayPrevMonth.toISOString();
                periodEnd = lastDayPrevMonth.toISOString();
                logger_js_1.default.info(`[Job] No period specified, defaulting to previous month: ${periodStart} - ${periodEnd}`);
            }
            await PartnerPayoutService_js_1.default.generatePayoutReports(new Date(periodStart), new Date(periodEnd));
        }
        catch (error) {
            logger_js_1.default.error(`[Job] Partner payouts failed: ${error}`);
            throw error;
        }
    });
    // Schedule them
    // Renewals run daily at 1 AM
    await boss.schedule(exports.JOB_QUEUE_RENEWALS, '0 1 * * *');
    // Partner payouts run monthly on the 2nd at 2 AM
    await boss.schedule(exports.JOB_QUEUE_PARTNER_PAYOUTS, '0 2 2 * *');
}
