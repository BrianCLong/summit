"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const mul_ledger_1 = require("../src/mul-ledger");
const signer = {
    keyId: 'test-key',
    secret: 'secret'
};
(0, vitest_1.describe)('ModelUsageLedger', () => {
    (0, vitest_1.it)('maintains hash integrity across appended events', () => {
        const ledger = new mul_ledger_1.ModelUsageLedger(':memory:');
        const first = ledger.appendEvent({
            model: 'gaia',
            version: '1.0.0',
            datasetLineageId: 'dl-001',
            consentScope: 'research',
            dpBudgetSpend: 2.5,
            policyHash: 'policy-a',
            outputArtifactIds: ['art-1']
        });
        const second = ledger.appendEvent({
            model: 'gaia',
            version: '1.0.1',
            datasetLineageId: 'dl-001',
            consentScope: 'research',
            dpBudgetSpend: 1.5,
            policyHash: 'policy-b',
            outputArtifactIds: ['art-2']
        });
        (0, vitest_1.expect)(second.previousHash).toBe(first.hash);
        const integrity = ledger.verifyIntegrity();
        (0, vitest_1.expect)(integrity.ok).toBe(true);
    });
    (0, vitest_1.it)('detects tampering via integrity check', () => {
        const ledger = new mul_ledger_1.ModelUsageLedger(':memory:');
        const record = ledger.appendEvent({
            model: 'gaia',
            version: '1.0.0',
            datasetLineageId: 'dl-001',
            consentScope: 'research',
            dpBudgetSpend: 1,
            policyHash: 'policy',
            outputArtifactIds: []
        });
        const db = ledger.db;
        db.prepare('UPDATE ledger_entries SET dp_budget_spend = 99 WHERE event_id = ?').run(record.eventId);
        const integrity = ledger.verifyIntegrity();
        (0, vitest_1.expect)(integrity.ok).toBe(false);
        (0, vitest_1.expect)(integrity.failure?.reason).toBe('HASH_MISMATCH');
    });
    (0, vitest_1.it)('exports monthly compliance pack with exact totals', () => {
        const ledger = new mul_ledger_1.ModelUsageLedger(':memory:');
        ledger.appendEvent({
            model: 'gaia',
            version: '1.0.0',
            datasetLineageId: 'dl-001',
            consentScope: 'research',
            dpBudgetSpend: 2,
            policyHash: 'policy-a',
            outputArtifactIds: [],
            timestamp: '2024-05-05T00:00:00.000Z'
        });
        ledger.appendEvent({
            model: 'gaia',
            version: '1.0.1',
            datasetLineageId: 'dl-002',
            consentScope: 'analytics',
            dpBudgetSpend: 3,
            policyHash: 'policy-b',
            outputArtifactIds: [],
            timestamp: '2024-05-06T00:00:00.000Z'
        });
        const pack = ledger.exportMonthlyCompliancePack('2024-05', signer);
        (0, vitest_1.expect)(pack.pack.totals.events).toBe(2);
        (0, vitest_1.expect)(pack.pack.totals.dpBudgetSpend).toBe(5);
        (0, vitest_1.expect)(pack.pack.digest).toBeDefined();
        const digestRecalc = (0, node_crypto_1.createHash)('sha256')
            .update(JSON.stringify(pack.pack.events))
            .digest('hex');
        (0, vitest_1.expect)(pack.pack.digest).toBe(digestRecalc);
    });
});
(0, vitest_1.describe)('Ledger API', () => {
    (0, vitest_1.it)('accepts writes and queries through HTTP', async () => {
        const ledger = new mul_ledger_1.ModelUsageLedger(':memory:');
        const app = (0, express_1.default)();
        app.use('/', (0, mul_ledger_1.createLedgerRouter)(ledger, { signer }));
        const request = (0, supertest_1.default)(app);
        const response = await request.post('/events').send({
            model: 'gaia',
            version: '1.0.0',
            datasetLineageId: 'dl-001',
            consentScope: 'research',
            dpBudgetSpend: 1.2,
            policyHash: 'policy',
            outputArtifactIds: []
        });
        (0, vitest_1.expect)(response.status).toBe(201);
        const list = await request.get('/events');
        (0, vitest_1.expect)(list.body.events.length).toBe(1);
        const integrity = await request.get('/integrity');
        (0, vitest_1.expect)(integrity.body.ok).toBe(true);
        const pack = await request.get('/compliance-pack').query({ month: '2024-05' });
        (0, vitest_1.expect)(pack.status).toBe(200);
        (0, vitest_1.expect)(pack.body.signature.value).toBeDefined();
    });
});
(0, vitest_1.describe)('MulLedgerSdk', () => {
    (0, vitest_1.it)('logs events with negligible overhead', () => {
        const ledger = new mul_ledger_1.ModelUsageLedger(':memory:');
        const sdk = new mul_ledger_1.MulLedgerSdk(ledger);
        const average = sdk.benchmark(30, () => ({
            model: 'gaia',
            version: '1.0.0',
            datasetLineageId: 'dl-001',
            consentScope: 'research',
            dpBudgetSpend: 0.5,
            policyHash: 'policy',
            outputArtifactIds: []
        }));
        (0, vitest_1.expect)(average).toBeLessThan(5);
    });
});
