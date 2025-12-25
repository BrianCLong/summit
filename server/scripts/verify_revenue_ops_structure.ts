// Revenue Maturity & Compliance Verification Script
// Structural check of new components

import { RenewalService } from '../src/services/RenewalService.js';
import { PricingConfigurationService } from '../src/services/PricingConfigurationService.js';
import { PartnerPayoutService } from '../src/services/PartnerPayoutService.js';
import { registerRevenueJobs } from '../src/jobs/revenue/RevenueJobs.js';

// Mock PgBoss class
class MockPgBoss {
    async work(queue: string, handler: any) { console.log(`[MockBoss] Registered worker for ${queue}`); }
    async schedule(queue: string, cron: string) { console.log(`[MockBoss] Scheduled ${queue} at ${cron}`); }
}

async function main() {
  console.log('Verifying Revenue Maturity Services...');

  try {
    // Basic structural checks - we are not running them because they require a real DB pool which fails in this script environment
    // without extensive mocking of the `pg` module at the system level.
    // Instead, we verify we can import them and they have the expected methods.

    if (typeof RenewalService.getInstance === 'function') {
        console.log('RenewalService structure OK.');
    } else {
        throw new Error('RenewalService missing getInstance');
    }

    if (typeof PricingConfigurationService.getInstance === 'function') {
        console.log('PricingConfigurationService structure OK.');
    } else {
        throw new Error('PricingConfigurationService missing getInstance');
    }

    if (typeof PartnerPayoutService.getInstance === 'function') {
        console.log('PartnerPayoutService structure OK.');
    } else {
        throw new Error('PartnerPayoutService missing getInstance');
    }

    if (typeof registerRevenueJobs === 'function') {
        console.log('RevenueJobs registration function OK.');
    } else {
        throw new Error('RevenueJobs missing registerRevenueJobs export');
    }

    console.log('Structural verification passed.');
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

main();
