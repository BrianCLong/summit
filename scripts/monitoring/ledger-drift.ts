import { LedgerStore } from '../../server/src/ledger/store.js';
import { StatusMapProjection } from '../../server/src/ledger/projections/status-map.js';
import { PolicyViewProjection } from '../../server/src/ledger/projections/policy-view.js';
import { LedgerMetricsGenerator } from '../../server/src/observability/ledger-metrics.js';
import * as fs from 'fs';

function main() {
    process.env.DETERMINISTIC_TIME = '2026-03-06T12:00:00Z'; // Fixture

    const store = new LedgerStore('artifacts/ledger/event-log.ndjson');
    const events = store.getEvents();

    const statusMap = new StatusMapProjection().build(events);
    const policyView = new PolicyViewProjection().build(events);
    const metrics = new LedgerMetricsGenerator().generate(events);

    fs.writeFileSync('artifacts/ledger/report.json', JSON.stringify({
        status: statusMap,
        policy: policyView
    }, null, 2));

    fs.writeFileSync('artifacts/ledger/metrics.json', JSON.stringify({
        metrics
    }, null, 2));

    fs.writeFileSync('artifacts/ledger/stamp.json', JSON.stringify({
        timestamp: process.env.DETERMINISTIC_TIME,
        eventCount: events.length
    }, null, 2));

    console.log("Drift detection completed.");
}

main();
