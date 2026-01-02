import PgBoss from 'pg-boss';
import RenewalService from '../../services/RenewalService.js';
import PartnerPayoutService from '../../services/PartnerPayoutService.js';
import logger from '../../utils/logger.js';

export const JOB_QUEUE_RENEWALS = 'process-renewals';
export const JOB_QUEUE_PARTNER_PAYOUTS = 'process-partner-payouts';

export async function registerRevenueJobs(boss: any) {
    // Renewals Job
    await boss.work(JOB_QUEUE_RENEWALS, async (job: any) => {
        logger.info(`[Job] Processing renewals job ${job.id}`);
        try {
            await RenewalService.processRenewals();
        } catch (error: any) {
            logger.error(`[Job] Renewal processing failed: ${error}`);
            throw error;
        }
    });

    // Partner Payouts Job
    await boss.work(JOB_QUEUE_PARTNER_PAYOUTS, async (job: any) => {
        logger.info(`[Job] Processing partner payouts job ${job.id}`);
        try {
            let { periodStart, periodEnd } = job.data || {};

            // Calculate default period (previous month) if missing
            if (!periodStart || !periodEnd) {
                const now = new Date();
                const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                periodStart = firstDayPrevMonth.toISOString();
                periodEnd = lastDayPrevMonth.toISOString();
                logger.info(`[Job] No period specified, defaulting to previous month: ${periodStart} - ${periodEnd}`);
            }

            await PartnerPayoutService.generatePayoutReports(new Date(periodStart), new Date(periodEnd));
        } catch (error: any) {
            logger.error(`[Job] Partner payouts failed: ${error}`);
            throw error;
        }
    });

    // Schedule them
    // Renewals run daily at 1 AM
    await boss.schedule(JOB_QUEUE_RENEWALS, '0 1 * * *');

    // Partner payouts run monthly on the 2nd at 2 AM
    await boss.schedule(JOB_QUEUE_PARTNER_PAYOUTS, '0 2 2 * *');
}
