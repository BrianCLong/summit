"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("../src/index"));
const policy_store_1 = require("../src/policy-store");
const policy_store_2 = require("../src/policy-store");
describe('policy-lac HTTP API', () => {
    it('denies export without purpose', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/policy/explain')
            .send({ action: 'export:bundle', resource: 'case:1', attributes: { purpose: 'internal' } });
        expect(res.status).toBe(200);
        expect(res.body.allowed).toBe(false);
        expect(res.body.reason).toMatch(/Denied/);
    });
    it('allows read under S2', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/policy/explain')
            .send({ action: 'graph:read', resource: 'node:abc', attributes: { sensitivity: 'S1' } });
        expect(res.status).toBe(200);
        expect(res.body.allowed).toBe(true);
    });
    it('reloads and diffs policies', async () => {
        const reload = await (0, supertest_1.default)(index_1.default).post('/policy/reload');
        expect(reload.status).toBe(200);
        expect(reload.body.rules).toBeGreaterThan(0);
        const dir = path_1.default.join(__dirname, '..', 'policies', 'examples');
        const current = (0, policy_store_1.mergePolicies)((0, policy_store_1.discoverPolicies)(dir));
        const diff = await (0, supertest_1.default)(index_1.default)
            .post('/policy/diff')
            .send({ leftPath: path_1.default.join(dir, 'allow-read-low.json'), rightPath: path_1.default.join(dir, 'deny-export-no-purpose.json') });
        expect(diff.status).toBe(200);
        const body = diff.body;
        expect(Array.isArray(body.added)).toBe(true);
        expect(Array.isArray(body.removed)).toBe(true);
        expect(Array.isArray(body.changed)).toBe(true);
        expect(body.added.length + body.removed.length + body.changed.length).toBeGreaterThanOrEqual(1);
        // also verify direct evaluation stays deterministic
        const decision = (0, policy_store_2.explainDecision)(current, {
            action: 'graph:read',
            resource: 'node:xyz',
            attributes: { sensitivity: 'S1' },
        });
        expect(decision.allowed).toBe(true);
    });
});
