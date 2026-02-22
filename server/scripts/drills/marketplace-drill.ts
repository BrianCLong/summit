
import { marketplaceService } from '../../src/services/MarketplaceService.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #119: Summit Marketplace Drill.
 * Validates discovery and publication of certified assets.
 */
async function runMarketplaceDrill() {
  logger.info('🚀 Starting Summit Marketplace Drill');

  console.log('--- Step 1: Discovering Certified Connectors ---');
  const connectors = await marketplaceService.listAssets({ type: 'connector', certified: true });
  console.log(`Found ${connectors.length} certified connectors.`);

  if (connectors.length === 0) {
    throw new Error('No assets found in registry');
  }

  console.log('--- Step 2: Publishing Custom Runbook ---');
  const myRunbook = await marketplaceService.publishAsset({
    name: 'Ransomware Recovery 2027',
    type: 'runbook',
    provider: 'Cyber-Safe-Global',
    version: '1.0.0'
  });

  console.log(`Published Asset: ${myRunbook.name} (${myRunbook.id})`);
  console.log(`PQC Signature: ${myRunbook.pqcSignature}`);

  if (myRunbook.certified && myRunbook.pqcSignature.startsWith('pqc-sig:')) {
    logger.info('✅ Summit Marketplace Operational (Asset certification verified)');
    process.exit(0);
  } else {
    logger.error('❌ Marketplace Publication Failed');
    process.exit(1);
  }
}

runMarketplaceDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});
