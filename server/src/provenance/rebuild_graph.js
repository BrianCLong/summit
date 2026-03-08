"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebuildGraph = rebuildGraph;
const ledger_js_1 = require("./ledger.js");
const CanonicalGraphService_js_1 = require("./CanonicalGraphService.js");
const pg_js_1 = require("../db/pg.js");
async function rebuildGraph() {
    console.log('Starting Lineage Graph Rebuild...');
    const startTime = Date.now();
    try {
        // 1. Get all tenants
        const tenantRes = await pg_js_1.pool.query('SELECT DISTINCT tenant_id FROM provenance_ledger_v2');
        const tenants = tenantRes.rows.map((r) => r.tenant_id);
        console.log(`Found ${tenants.length} tenants.`);
        let totalProcessed = 0;
        for (const tenantId of tenants) {
            console.log(`Processing tenant: ${tenantId}`);
            let lastSeq = 0n;
            let batchCount = 0;
            while (true) {
                const entries = await ledger_js_1.provenanceLedger.getEntries(tenantId, {
                    fromSequence: lastSeq + 1n,
                    limit: 100,
                    order: 'ASC'
                });
                if (entries.length === 0)
                    break;
                for (const entry of entries) {
                    try {
                        await CanonicalGraphService_js_1.CanonicalGraphService.getInstance().projectEntry(entry);
                        totalProcessed++;
                    }
                    catch (e) {
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
    }
    catch (e) {
        console.error('Rebuild failed:', e);
        process.exit(1);
    }
    finally {
        // Allow process to exit if pool doesn't hang
    }
}
// Execute if running directly
// @ts-ignore
if (import.meta.url.endsWith(process.argv[1])) {
    rebuildGraph();
}
