"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const postgres_js_1 = require("../../db/postgres.js");
const CaseOverviewCacheRepo_js_1 = require("../../repos/CaseOverviewCacheRepo.js");
const TENANT_ID = 'tenant-case-overview-route';
const USER_ID = 'case-overview-route-user';
const describeIfDb = process.env.ZERO_FOOTPRINT === 'true' ? globals_1.describe.skip : globals_1.describe;
async function seedCase(pg) {
    const { rows } = (await pg.query(`INSERT INTO maestro.cases (id, tenant_id, title, status, created_by)
     VALUES (gen_random_uuid(), $1, 'Overview Case Route', 'open', $2)
     RETURNING id`, [TENANT_ID, USER_ID]));
    const caseId = rows[0].id;
    await pg.query(`INSERT INTO maestro.case_graph_references (case_id, graph_entity_id, entity_label, entity_type, relationship_type, added_by)
     VALUES ($1, 'entity-1', 'Alpha', 'person', 'subject', $2),
            ($1, 'entity-1', 'Alpha', 'person', 'subject', $2),
            ($1, 'entity-2', 'Bravo', 'organization', 'related_to', $2)`, [caseId, USER_ID]);
    await pg.query(`INSERT INTO maestro.case_tasks (case_id, title, status, task_type, created_by)
     VALUES ($1, 'Collect evidence', 'completed', 'analysis', $2),
            ($1, 'Interview witness', 'pending', 'standard', $2)`, [caseId, USER_ID]);
    await pg.query(`INSERT INTO maestro.case_participants (case_id, user_id, role_id, assigned_by)
     VALUES ($1, $2, '00000000-0000-0000-0000-000000000001', $2)`, [caseId, USER_ID]);
    await pg.query(`INSERT INTO maestro.case_state_history (case_id, to_stage, to_status, transitioned_by, reason)
     VALUES ($1, 'intake', 'open', $2, 'seeded for overview cache route')`, [caseId, USER_ID]);
    await pg.query(`INSERT INTO maestro.audit_access_logs (tenant_id, case_id, user_id, action, resource_type, resource_id, reason, legal_basis)
     VALUES ($1, $2, $3, 'view', 'case', $2, 'seed overview cache route', 'investigation')`, [TENANT_ID, caseId, USER_ID]);
    return caseId;
}
async function cleanupCase(pg, caseId) {
    await pg.query('DELETE FROM maestro.case_graph_references WHERE case_id = $1', [caseId]);
    await pg.query('DELETE FROM maestro.case_tasks WHERE case_id = $1', [caseId]);
    await pg.query('DELETE FROM maestro.case_participants WHERE case_id = $1', [caseId]);
    await pg.query('DELETE FROM maestro.case_state_history WHERE case_id = $1', [caseId]);
    await pg.query('DELETE FROM maestro.audit_access_logs WHERE case_id = $1', [caseId]);
    await pg.query('DELETE FROM maestro.case_overview_cache WHERE case_id = $1', [caseId]);
    await pg.query('DELETE FROM maestro.cases WHERE id = $1', [caseId]);
}
describeIfDb('GET /api/cases/:id/overview', () => {
    let app;
    let pg;
    let repo;
    let caseId;
    (0, globals_1.beforeAll)(async () => {
        process.env.CASE_OVERVIEW_CACHE_TTL_MS = '50';
        process.env.CASE_OVERVIEW_CACHE_SWR_MS = '100';
        globals_1.jest.resetModules();
        pg = (0, postgres_js_1.getPostgresPool)();
        repo = new CaseOverviewCacheRepo_js_1.CaseOverviewCacheRepo(pg);
        caseId = await seedCase(pg);
        const routerModule = await Promise.resolve().then(() => __importStar(require('../cases.js')));
        const router = routerModule.default ?? routerModule.caseRouter;
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/cases', router);
    });
    (0, globals_1.afterAll)(async () => {
        delete process.env.CASE_OVERVIEW_CACHE_TTL_MS;
        delete process.env.CASE_OVERVIEW_CACHE_SWR_MS;
        await cleanupCase(pg, caseId);
        await pg.end();
    });
    (0, globals_1.it)('serves cached overview with hit/miss tracking', async () => {
        const first = await (0, supertest_1.default)(app)
            .get(`/api/cases/${caseId}/overview`)
            .query({ reason: 'testing overview', legalBasis: 'investigation' })
            .set('x-tenant-id', TENANT_ID)
            .set('x-user-id', USER_ID);
        (0, globals_1.expect)(first.status).toBe(200);
        (0, globals_1.expect)(first.body.cache.status).toBe('miss');
        const cacheAfterMiss = await repo.get(caseId, TENANT_ID);
        (0, globals_1.expect)(cacheAfterMiss?.missCount).toBeGreaterThanOrEqual(1);
        const second = await (0, supertest_1.default)(app)
            .get(`/api/cases/${caseId}/overview`)
            .query({ reason: 'testing overview', legalBasis: 'investigation' })
            .set('x-tenant-id', TENANT_ID)
            .set('x-user-id', USER_ID);
        (0, globals_1.expect)(second.status).toBe(200);
        (0, globals_1.expect)(second.body.cache.status).toBe('fresh');
        const cacheAfterHit = await repo.get(caseId, TENANT_ID);
        (0, globals_1.expect)(cacheAfterHit?.hitCount).toBeGreaterThanOrEqual(1);
    });
    (0, globals_1.it)('uses stale-while-revalidate to refresh in the background', async () => {
        const priming = await (0, supertest_1.default)(app)
            .get(`/api/cases/${caseId}/overview`)
            .query({ reason: 'priming overview cache', legalBasis: 'investigation' })
            .set('x-tenant-id', TENANT_ID)
            .set('x-user-id', USER_ID);
        (0, globals_1.expect)(priming.status).toBe(200);
        const initialRefreshedAt = new Date(priming.body.refreshedAt);
        await new Promise((resolve) => setTimeout(resolve, 70));
        const stale = await (0, supertest_1.default)(app)
            .get(`/api/cases/${caseId}/overview`)
            .query({ reason: 'stale access', legalBasis: 'investigation' })
            .set('x-tenant-id', TENANT_ID)
            .set('x-user-id', USER_ID);
        (0, globals_1.expect)(stale.status).toBe(200);
        (0, globals_1.expect)(stale.body.cache.status).toBe('stale');
        (0, globals_1.expect)(stale.body.refreshStatus).toBe('revalidating');
        await new Promise((resolve) => setTimeout(resolve, 150));
        const refreshed = await repo.get(caseId, TENANT_ID);
        (0, globals_1.expect)(refreshed?.refreshedAt.getTime()).toBeGreaterThan(initialRefreshedAt.getTime());
        (0, globals_1.expect)(refreshed?.refreshStatus).toBe('fresh');
    });
});
