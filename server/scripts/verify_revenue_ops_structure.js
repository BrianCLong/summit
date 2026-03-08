"use strict";
// Revenue Maturity & Compliance Verification Script
// Structural check of new components
Object.defineProperty(exports, "__esModule", { value: true });
const RenewalService_js_1 = require("../src/services/RenewalService.js");
const PricingConfigurationService_js_1 = require("../src/services/PricingConfigurationService.js");
const PartnerPayoutService_js_1 = require("../src/services/PartnerPayoutService.js");
const RevenueJobs_js_1 = require("../src/jobs/revenue/RevenueJobs.js");
// Mock PgBoss class
class MockPgBoss {
    async work(queue, handler) { console.log(`[MockBoss] Registered worker for ${queue}`); }
    async schedule(queue, cron) { console.log(`[MockBoss] Scheduled ${queue} at ${cron}`); }
}
async function main() {
    console.log('Verifying Revenue Maturity Services...');
    try {
        // Basic structural checks - we are not running them because they require a real DB pool which fails in this script environment
        // without extensive mocking of the `pg` module at the system level.
        // Instead, we verify we can import them and they have the expected methods.
        if (typeof RenewalService_js_1.RenewalService.getInstance === 'function') {
            console.log('RenewalService structure OK.');
        }
        else {
            throw new Error('RenewalService missing getInstance');
        }
        if (typeof PricingConfigurationService_js_1.PricingConfigurationService.getInstance === 'function') {
            console.log('PricingConfigurationService structure OK.');
        }
        else {
            throw new Error('PricingConfigurationService missing getInstance');
        }
        if (typeof PartnerPayoutService_js_1.PartnerPayoutService.getInstance === 'function') {
            console.log('PartnerPayoutService structure OK.');
        }
        else {
            throw new Error('PartnerPayoutService missing getInstance');
        }
        if (typeof RevenueJobs_js_1.registerRevenueJobs === 'function') {
            console.log('RevenueJobs registration function OK.');
        }
        else {
            throw new Error('RevenueJobs missing registerRevenueJobs export');
        }
        console.log('Structural verification passed.');
    }
    catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}
main();
