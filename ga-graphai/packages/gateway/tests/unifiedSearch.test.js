"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_js_1 = require("../src/app.js");
const unified_js_1 = require("../src/search/unified.js");
const datasetPath = node_path_1.default.resolve(__dirname, '../../../test-data/search-index-sample.json');
function buildTestApp() {
    const searchIndex = new unified_js_1.UnifiedSearchIndex({ now: () => new Date('2025-09-01T00:00:00Z') });
    searchIndex.loadFromFile(datasetPath);
    const app = (0, app_js_1.createApp)({
        searchService: { index: searchIndex, query: (params) => searchIndex.query(params) },
    });
    return app;
}
(0, vitest_1.describe)('Unified search API', () => {
    (0, vitest_1.it)('filters by tenant and type and enforces purpose header', async () => {
        const app = buildTestApp();
        const res = await (0, supertest_1.default)(app)
            .get('/api/search/unified')
            .query({ q: 'bridge', tenant_id: 'acme', types: ['event'] })
            .set('x-purpose', 'investigation');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items).toHaveLength(1);
        (0, vitest_1.expect)(res.body.items[0].id).toBe('evt-9');
        (0, vitest_1.expect)(res.body.items[0].highlight.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('rejects missing tenant and purpose', async () => {
        const app = buildTestApp();
        const res = await (0, supertest_1.default)(app)
            .get('/api/search/unified')
            .query({ q: 'bridge' });
        (0, vitest_1.expect)(res.status).toBe(400);
        const resPurpose = await (0, supertest_1.default)(app)
            .get('/api/search/unified')
            .query({ q: 'bridge', tenant_id: 'acme' });
        (0, vitest_1.expect)(resPurpose.status).toBe(412);
    });
    (0, vitest_1.it)('supports cursor pagination with verification', async () => {
        const index = new unified_js_1.UnifiedSearchIndex({ now: () => new Date('2025-09-01T00:00:00Z') });
        index.loadFromFile(datasetPath);
        const firstPage = index.query({ q: 'project', tenant_id: 'odin', page_size: 1 });
        (0, vitest_1.expect)(firstPage.cursor).toBeTruthy();
        const decoded = (0, unified_js_1.decodeSearchCursor)(firstPage.cursor, index.cursorSecret);
        (0, vitest_1.expect)(decoded.tenant_id).toBe('odin');
        const secondPage = index.query({
            q: 'project',
            tenant_id: 'odin',
            cursor: firstPage.cursor,
            page_size: 1,
        });
        (0, vitest_1.expect)(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
    });
    (0, vitest_1.it)('blocks when budget exceeded', async () => {
        const index = new unified_js_1.UnifiedSearchIndex({ now: () => new Date('2025-09-01T00:00:00Z') });
        index.loadFromFile(datasetPath);
        const app = (0, app_js_1.createApp)({
            searchService: { index, query: (params) => index.query(params) },
            privacyOptions: {
                thresholds: { daily_limit: 1, per_user_limit: 1, burst_limit: 1 },
            },
        });
        const first = await (0, supertest_1.default)(app)
            .get('/api/search/unified')
            .query({ q: 'project', tenant_id: 'odin', page_size: 1 })
            .set('x-purpose', 'demo');
        (0, vitest_1.expect)(first.status).toBe(200);
        const blocked = await (0, supertest_1.default)(app)
            .get('/api/search/unified')
            .query({ q: 'project', tenant_id: 'odin', page_size: 10 })
            .set('x-purpose', 'demo');
        (0, vitest_1.expect)(blocked.status).toBe(403);
    });
});
