"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const postgres_js_1 = require("../db/postgres.js");
const CaseOverviewService_js_1 = require("../cases/overview/CaseOverviewService.js");
const CaseOverviewCacheRepo_js_1 = require("../repos/CaseOverviewCacheRepo.js");
const TENANT_ID = 'tenant-overview-cache';
const USER_ID = 'case-overview-tester';
async function seedCase(pg) {
    const { rows } = (await pg.query(`INSERT INTO maestro.cases (id, tenant_id, title, status, created_by)
     VALUES (gen_random_uuid(), $1, 'Overview Case', 'open', $2)
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
     VALUES ($1, 'intake', 'open', $2, 'seeded for overview cache')`, [caseId, USER_ID]);
    await pg.query(`INSERT INTO maestro.audit_access_logs (tenant_id, case_id, user_id, action, resource_type, resource_id, reason, legal_basis)
     VALUES ($1, $2, $3, 'view', 'case', $2, 'seed overview cache', 'investigation')`, [TENANT_ID, caseId, USER_ID]);
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
const describeDatabase = process.env.ZERO_FOOTPRINT === 'true' ? globals_1.describe.skip : globals_1.describe;
describeDatabase('CaseOverviewService cache', () => {
    let pg;
    let service;
    let repo;
    let caseId;
    (0, globals_1.beforeAll)(async () => {
        pg = (0, postgres_js_1.getPostgresPool)();
        service = new CaseOverviewService_js_1.CaseOverviewService(pg, { ttlMs: 100, staleWhileRevalidateMs: 200 });
        repo = new CaseOverviewCacheRepo_js_1.CaseOverviewCacheRepo(pg);
        caseId = await seedCase(pg);
    });
    (0, globals_1.afterAll)(async () => {
        await cleanupCase(pg, caseId);
        await pg.end();
    });
    (0, globals_1.it)('computes and caches overview metrics with hit-rate tracking', async () => {
        const first = await service.getOverview(caseId, TENANT_ID);
        (0, globals_1.expect)(first.cache.status).toBe('miss');
        (0, globals_1.expect)(first.entityCount).toBe(3); // two rows for entity-1 + one for entity-2
        (0, globals_1.expect)(first.taskCount).toBe(2);
        (0, globals_1.expect)(first.openTaskCount).toBe(1);
        (0, globals_1.expect)(first.topEntities[0].graphEntityId).toBe('entity-1');
        const cacheRow = await repo.get(caseId, TENANT_ID);
        (0, globals_1.expect)(cacheRow?.hitCount).toBe(0);
        (0, globals_1.expect)(cacheRow?.missCount).toBe(1);
        const second = await service.getOverview(caseId, TENANT_ID);
        (0, globals_1.expect)(second.cache.status).toBe('fresh');
        const cacheRowAfterHit = await repo.get(caseId, TENANT_ID);
        (0, globals_1.expect)(cacheRowAfterHit?.hitCount).toBeGreaterThan(0);
    });
    (0, globals_1.it)('serves stale data while revalidating in background', async () => {
        const initial = await service.getOverview(caseId, TENANT_ID);
        const initialRefreshedAt = initial.refreshedAt;
        await new Promise((resolve) => setTimeout(resolve, 150));
        const stale = await service.getOverview(caseId, TENANT_ID);
        (0, globals_1.expect)(stale.cache.status).toBe('stale');
        await new Promise((resolve) => setTimeout(resolve, 200));
        const refreshed = await repo.get(caseId, TENANT_ID);
        (0, globals_1.expect)(refreshed?.refreshedAt.getTime()).toBeGreaterThan(initialRefreshedAt.getTime());
    });
    (0, globals_1.it)('rebuilds cache entries via rebuildAll', async () => {
        const rebuildCaseId = await seedCase(pg);
        await repo.delete(rebuildCaseId, TENANT_ID);
        const rebuiltCount = await service.rebuildAll(10);
        (0, globals_1.expect)(rebuiltCount).toBeGreaterThan(0);
        const rebuilt = await repo.get(rebuildCaseId, TENANT_ID);
        (0, globals_1.expect)(rebuilt).toBeDefined();
        await cleanupCase(pg, rebuildCaseId);
    });
    (0, globals_1.it)('invalidates cache safely and repopulates on demand', async () => {
        await service.invalidate(caseId, TENANT_ID);
        const afterInvalidate = await repo.get(caseId, TENANT_ID);
        (0, globals_1.expect)(afterInvalidate).toBeNull();
        const repopulated = await service.getOverview(caseId, TENANT_ID);
        (0, globals_1.expect)(repopulated.cache.status).toBe('miss');
    });
    (0, globals_1.it)('marks entries stale for event-driven refresh and processes them via refreshStale', async () => {
        const initial = await service.getOverview(caseId, TENANT_ID);
        await service.markStale(caseId, TENANT_ID);
        const staleTargets = await repo.listCasesNeedingRefresh();
        (0, globals_1.expect)(staleTargets.some((target) => target.caseId === caseId)).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 50));
        const refreshedCount = await service.refreshStale();
        (0, globals_1.expect)(refreshedCount).toBeGreaterThan(0);
        const refreshed = await repo.get(caseId, TENANT_ID);
        (0, globals_1.expect)(refreshed?.refreshedAt.getTime()).toBeGreaterThan(initial.refreshedAt.getTime());
        (0, globals_1.expect)(refreshed?.refreshStatus).toBe('fresh');
    });
});
