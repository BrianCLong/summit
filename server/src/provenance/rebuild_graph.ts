
import { provenanceLedger } from './ledger.js';
import { CanonicalGraphService } from './CanonicalGraphService.js';
import { pool } from '../db/pg.js';

async function rebuildGraph() {
  console.log('Starting Lineage Graph Rebuild...');
  const startTime = Date.now();

  try {
    // 1. Get all tenants
    const tenantRes = await pool.query('SELECT DISTINCT tenant_id FROM provenance_ledger_v2');
    const tenants = tenantRes.rows.map((r: any) => r.tenant_id);

    console.log(`Found ${tenants.length} tenants.`);

    let totalProcessed = 0;

    for (const tenantId of tenants) {
      console.log(`Processing tenant: ${tenantId}`);
      let lastSeq = 0n;
      let batchCount = 0;

      while (true) {
        const entries = await provenanceLedger.getEntries(tenantId, {
          fromSequence: lastSeq + 1n,
          limit: 100,
          order: 'ASC'
        });

        if (entries.length === 0) break;

        for (const entry of entries) {
           try {
             await CanonicalGraphService.getInstance().projectEntry(entry);
             totalProcessed++;
           } catch (e) {
             console.error(`Failed to project entry ${entry.id}`, e);
           }
           lastSeq = entry.sequenceNumber;
        }

        batchCount++;
        if (batchCount % 10 === 0) {
            console.log(`  Processed ~${batchCount * 100} entries for ${tenantId}...`);
        }
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Rebuild Complete. Processed ${totalProcessed} entries in ${duration}s.`);

  } catch (e) {
    console.error('Rebuild failed:', e);
    process.exit(1);
  } finally {
      // Allow process to exit if pool doesn't hang
  }
}

// Execute if running directly
// @ts-ignore
if (import.meta.url.endsWith(process.argv[1])) {
  rebuildGraph();
}

export { rebuildGraph };
