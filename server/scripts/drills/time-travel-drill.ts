
import { bitemporalService } from '../../src/services/BitemporalService.js';
import { logger } from '../../src/config/logger.js';
import { randomUUID } from 'node:crypto';

/**
 * Task #109: Time-Travel Drill.
 * Validates Bitemporal tracking by simulating retroactive corrections.
 */
async function runTimeTravelDrill() {
  logger.info('🚀 Starting Time-Travel Drill');

  const entityId = randomUUID();
  const tenantId = 'drill-tenant';

  const dec1 = new Date('2025-12-01T00:00:00Z');
  const dec15 = new Date('2025-12-15T00:00:00Z');
  const dec20 = new Date('2025-12-20T00:00:00Z');
  const jan1 = new Date('2026-01-01T00:00:00Z');
  const jan2 = new Date('2026-01-02T00:00:00Z');
  const jan5 = new Date('2026-01-05T00:00:00Z');
  const jan6 = new Date('2026-01-06T00:00:00Z');

  console.log('\n--- Step 1: Recording initial fact (observed on Jan 1) ---');
  await bitemporalService.recordFact({
    id: entityId,
    tenantId,
    kind: 'Person',
    props: { name: 'Alice', city: 'London' },
    validFrom: dec1,
    transactionFrom: jan1
  });

  console.log('\n--- Step 2: Querying as of Jan 2 (Our knowledge before the correction) ---');
  const knowledgeBefore = await bitemporalService.queryAsOf(entityId, tenantId, dec20, jan2);
  console.log(`Knowledge on Jan 2 about Dec 20: Alice lived in ${knowledgeBefore?.props.city || 'Unknown'}`);

  if (knowledgeBefore?.props.city !== 'London') {
    throw new Error(`Expected London, got ${knowledgeBefore?.props.city}`);
  }

  console.log('\n--- Step 3: Recording correction (observed on Jan 5, retroactive to Dec 15) ---');
  await bitemporalService.recordFact({
    id: entityId,
    tenantId,
    kind: 'Person',
    props: { name: 'Alice', city: 'Paris' },
    validFrom: dec15,
    transactionFrom: jan5
  });

  console.log('\n--- Step 4: Querying as of Jan 6 (Our knowledge after the correction) ---');
  const knowledgeAfter = await bitemporalService.queryAsOf(entityId, tenantId, dec20, jan6);
  console.log(`Knowledge on Jan 6 about Dec 20: Alice lived in ${knowledgeAfter?.props.city || 'Unknown'}`);

  if (knowledgeAfter?.props.city !== 'Paris') {
    throw new Error(`Expected Paris, got ${knowledgeAfter?.props.city}`);
  }

  console.log('\n--- Step 5: Historical consistency check (Jan 2 knowledge should NOT have changed) ---');
  const knowledgeReplay = await bitemporalService.queryAsOf(entityId, tenantId, dec20, jan2);
  console.log(`Replay knowledge on Jan 2 about Dec 20: Alice lived in ${knowledgeReplay?.props.city || 'Unknown'}`);

  if (knowledgeReplay?.props.city !== 'London') {
    throw new Error(`Time-travel failure! Replay expected London, got ${knowledgeReplay?.props.city}`);
  }

  logger.info('✅ Time-Travel Drill Passed');
  process.exit(0);
}

runTimeTravelDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});
