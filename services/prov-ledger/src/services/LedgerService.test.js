"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const globals_1 = require("@jest/globals");
const LedgerService_1 = require("./LedgerService");
(0, globals_1.describe)('LedgerService', () => {
    const ledger = LedgerService_1.LedgerService.getInstance();
    (0, globals_1.beforeEach)(async () => {
        await ledger._reset();
    });
    (0, globals_1.it)('should store and retrieve entries by caseId', async () => {
        const caseId = 'case-123';
        await ledger.registerEvidence({
            source: 'test',
            hash: 'abc',
            caseId
        });
        const bundle = await ledger.getBundle(caseId);
        (0, globals_1.expect)(bundle).not.toBeNull();
        (0, globals_1.expect)(bundle.entries).toHaveLength(1);
        (0, globals_1.expect)(bundle.bundleId).toBe(caseId);
        (0, globals_1.expect)(bundle.entries[0].caseId).toBe(caseId);
    });
    (0, globals_1.it)('should isolate entries from different cases', async () => {
        await ledger.registerEvidence({ source: 's1', hash: 'h1', caseId: 'c1' });
        await ledger.registerEvidence({ source: 's2', hash: 'h2', caseId: 'c2' });
        const bundle1 = await ledger.getBundle('c1');
        const bundle2 = await ledger.getBundle('c2');
        (0, globals_1.expect)(bundle1.entries).toHaveLength(1);
        (0, globals_1.expect)(bundle2.entries).toHaveLength(1);
        const data1 = bundle1.entries[0].data;
        (0, globals_1.expect)(data1.source).toBe('s1');
        const data2 = bundle2.entries[0].data;
        (0, globals_1.expect)(data2.source).toBe('s2');
    });
    (0, globals_1.it)('should link entries within the same case', async () => {
        const caseId = 'c3';
        const id1 = await ledger.registerEvidence({ source: 's1', hash: 'h1', caseId });
        const id2 = await ledger.registerEvidence({ source: 's2', hash: 'h2', caseId });
        const bundle = await ledger.getBundle(caseId);
        (0, globals_1.expect)(bundle.entries).toHaveLength(2);
        (0, globals_1.expect)(bundle.entries[1].previousHash).toBe(bundle.entries[0].hash);
    });
});
