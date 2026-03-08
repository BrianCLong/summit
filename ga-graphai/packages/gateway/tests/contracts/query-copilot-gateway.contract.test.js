"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_js_1 = require("../../src/app.js");
const unified_js_1 = require("../../src/search/unified.js");
const datasetPath = node_path_1.default.resolve(__dirname, '../../../../test-data/search-index-sample.json');
(0, vitest_1.describe)('Contract: query-copilot -> gateway unified search', () => {
    (0, vitest_1.it)('returns stable schema and version header', async () => {
        const index = new unified_js_1.UnifiedSearchIndex({ now: () => new Date('2025-09-01T00:00:00Z') });
        index.loadFromFile(datasetPath);
        const app = (0, app_js_1.createApp)({
            searchService: { index, query: (params) => index.query(params) },
        });
        const res = await (0, supertest_1.default)(app)
            .get('/api/search/unified')
            .query({ q: 'bridge', tenant_id: 'acme' })
            .set('x-purpose', 'investigation')
            .set('Accept-Version', 'v1');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body.items)).toBe(true);
        (0, vitest_1.expect)(res.headers['content-type']).toContain('json');
        (0, vitest_1.expect)(res.body.items[0]).toHaveProperty('ranking_features');
    });
});
