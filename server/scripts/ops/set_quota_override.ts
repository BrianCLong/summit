
import { quotaOverrideService } from '../../src/lib/resources/overrides/QuotaOverrideService.js';
import { getRedisClient, closeRedis } from '../../src/config/database.js';

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error('Usage: npx tsx scripts/ops/set_quota_override.ts <tenantId> <meter> <ttlSeconds> [reason]');
        process.exit(1);
    }

    const [tenantId, meter, ttlSecondsStr, ...reasonParts] = args;
    const ttlSeconds = parseInt(ttlSecondsStr, 10);
    const reason = reasonParts.join(' ') || 'Manual override';

    if (isNaN(ttlSeconds)) {
        console.error('Invalid TTL');
        process.exit(1);
    }

    console.log(`Setting override for tenant=${tenantId} meter=${meter} ttl=${ttlSeconds}s reason="${reason}"`);

    try {
        await quotaOverrideService.setOverride(tenantId, meter, ttlSeconds, reason);
        console.log('Override set successfully.');
    } catch (error) {
        console.error('Failed to set override:', error);
    } finally {
        await closeRedis();
        process.exit(0);
    }
}

main().catch(console.error);
