"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../src/index");
(0, vitest_1.describe)('ProvenanceLedger', () => {
    (0, vitest_1.it)('appends entries and maintains a valid hash chain', () => {
        const ledger = new index_1.ProvenanceLedger();
        const first = ledger.append({
            id: '1',
            category: 'deployment',
            actor: 'ci-bot',
            action: 'promote',
            resource: 'service-api',
            payload: { version: '1.0.0' },
        });
        const second = ledger.append({
            id: '2',
            category: 'deployment',
            actor: 'ci-bot',
            action: 'promote',
            resource: 'service-api',
            payload: { version: '1.0.1' },
        });
        (0, vitest_1.expect)(first.hash).toBeTruthy();
        (0, vitest_1.expect)(second.previousHash).toBe(first.hash);
        (0, vitest_1.expect)(ledger.verify()).toBe(true);
    });
    (0, vitest_1.it)('filters entries by category and limit', () => {
        const ledger = new index_1.ProvenanceLedger();
        ledger.append({
            id: '1',
            category: 'policy',
            actor: 'compliance',
            action: 'approve',
            resource: 'llm',
            payload: { policy: 'safe' },
        });
        ledger.append({
            id: '2',
            category: 'deployment',
            actor: 'ci-bot',
            action: 'promote',
            resource: 'service-api',
            payload: { version: '1.0.0' },
        });
        const filtered = ledger.list({ category: 'deployment', limit: 1 });
        (0, vitest_1.expect)(filtered).toHaveLength(1);
        (0, vitest_1.expect)(filtered[0].category).toBe('deployment');
    });
    (0, vitest_1.it)('exports evidence bundles with the latest head hash', () => {
        const ledger = new index_1.ProvenanceLedger();
        ledger.append({
            id: '1',
            category: 'evaluation',
            actor: 'eval-service',
            action: 'score',
            resource: 'rag-output',
            payload: { score: 0.95 },
        });
        const bundle = ledger.exportEvidence();
        (0, vitest_1.expect)(bundle.entries).toHaveLength(1);
        (0, vitest_1.expect)(bundle.headHash).toBe(bundle.entries[0].hash);
    });
});
