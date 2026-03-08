"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
function buildLog() {
    const log = new index_js_1.AppendOnlyAuditLog();
    log.append({
        id: 'evt-1',
        actor: 'alice',
        action: 'login',
        resource: 'console',
        system: 'auth',
        category: 'access',
        metadata: { email: 'alice@example.com', ip: '10.0.0.1' },
    });
    log.append({
        id: 'evt-2',
        actor: 'alice',
        action: 'download',
        resource: 'report.pdf',
        system: 'content',
        category: 'export',
        metadata: { correlationIds: ['case-1'] },
    });
    log.append({
        id: 'evt-3',
        actor: 'bob',
        action: 'approve',
        resource: 'request-7',
        system: 'workflow',
        category: 'decision',
        metadata: { reviewer: 'bob' },
    });
    return log;
}
(0, vitest_1.describe)('Audit export API + verifier', () => {
    let app;
    let log;
    (0, vitest_1.beforeEach)(() => {
        log = buildLog();
        app = (0, express_1.default)();
        app.use((0, index_js_1.createAuditExportRouter)(log));
    });
    (0, vitest_1.it)('returns chained hashes on append and refuses mutations', () => {
        const ledger = new index_js_1.AppendOnlyAuditLog();
        const first = ledger.append({
            id: 'e-1',
            actor: 'system',
            action: 'create',
            resource: 'dataset:1',
            system: 'audit',
            category: 'ingest',
        });
        const second = ledger.append({
            id: 'e-2',
            actor: 'system',
            action: 'update',
            resource: 'dataset:1',
            system: 'audit',
            category: 'ingest',
        });
        (0, vitest_1.expect)(first.previousHash).toBeUndefined();
        (0, vitest_1.expect)(first.eventHash).toBeDefined();
        (0, vitest_1.expect)(second.previousHash).toBe(first.eventHash);
        (0, vitest_1.expect)(second.eventHash).toBeDefined();
        (0, vitest_1.expect)(() => ledger.append({
            ...second,
            id: first.id,
        })).toThrow(/append-only audit log rejects/i);
    });
    (0, vitest_1.it)('includes hash chain data and verifies clean exports', async () => {
        const response = await (0, supertest_1.default)(app).get('/audit/export?limit=2');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.events[0].eventHash).toBeDefined();
        (0, vitest_1.expect)(response.body.events[0].previousHash).toBeUndefined();
        (0, vitest_1.expect)(response.body.events[1].previousHash).toBe(response.body.events[0].eventHash);
        (0, vitest_1.expect)(response.body.verification.chain.ok).toBe(true);
        const exitCode = await (0, index_js_1.runAuditVerifierCli)(response.body.evidence, response.body.manifest);
        (0, vitest_1.expect)(exitCode).toBe(0);
    });
    (0, vitest_1.it)('detects tampering via the CLI verifier', async () => {
        const response = await (0, supertest_1.default)(app).get('/audit/export');
        const tampered = {
            ...response.body.evidence,
            entries: response.body.evidence.entries.map((entry, index) => index === 0 ? { ...entry, actor: 'mallory' } : entry),
        };
        const exitCode = await (0, index_js_1.runAuditVerifierCli)(tampered, response.body.manifest);
        (0, vitest_1.expect)(exitCode).toBe(1);
    });
    (0, vitest_1.it)('rejects attempts to mutate previously appended events', () => {
        (0, vitest_1.expect)(() => log.append({
            id: 'evt-1',
            actor: 'alice',
            action: 'download',
            resource: 'secret-report.pdf',
            system: 'content',
        })).toThrow('Append-only audit log rejects mutations to existing events');
    });
    (0, vitest_1.it)('paginates deterministically and redacts PII', async () => {
        const firstPage = await (0, supertest_1.default)(app).get('/audit/export?limit=2');
        (0, vitest_1.expect)(firstPage.body.page.pageSize).toBe(2);
        (0, vitest_1.expect)(firstPage.body.page.total).toBe(3);
        (0, vitest_1.expect)(firstPage.body.schema.piiSafe).toBe(true);
        const cursor = firstPage.body.page.nextCursor;
        (0, vitest_1.expect)(cursor).toBe(2);
        const secondPage = await (0, supertest_1.default)(app).get(`/audit/export?limit=2&cursor=${cursor}`);
        (0, vitest_1.expect)(secondPage.body.page.cursor).toBe(cursor);
        const combined = [
            ...firstPage.body.evidence.entries,
            ...secondPage.body.evidence.entries,
        ];
        (0, vitest_1.expect)(JSON.stringify(combined)).not.toContain('alice@example.com');
    });
    (0, vitest_1.it)('respects from/to boundaries and keeps pagination stable', async () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();
        log.append({
            id: 'evt-4',
            actor: 'carol',
            action: 'read',
            resource: 'handbook',
            system: 'knowledge',
            timestamp: yesterday,
        });
        const fromNow = await (0, supertest_1.default)(app).get(`/audit/export?from=${now}`);
        (0, vitest_1.expect)(fromNow.body.page.total).toBe(3);
        (0, vitest_1.expect)(fromNow.body.events.find((evt) => evt.id === 'evt-4')).toBeUndefined();
        const full = await (0, supertest_1.default)(app).get('/audit/export?limit=2&cursor=2&from=' + yesterday);
        (0, vitest_1.expect)(full.body.page.cursor).toBe(2);
        (0, vitest_1.expect)(full.body.page.total).toBe(4);
        (0, vitest_1.expect)(full.body.verification.chain.ok).toBe(true);
    });
});
