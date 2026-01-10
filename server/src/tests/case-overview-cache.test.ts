import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { Pool } from 'pg';
import { getPostgresPool } from '../db/postgres.js';
import { CaseOverviewService } from '../cases/overview/CaseOverviewService.js';
import { CaseOverviewCacheRepo } from '../repos/CaseOverviewCacheRepo.js';

const TENANT_ID = 'tenant-overview-cache';
const USER_ID = 'case-overview-tester';

async function seedCase(pg: Pool): Promise<string> {
  const { rows } = (await pg.query(
    `INSERT INTO maestro.cases (id, tenant_id, title, status, created_by)
     VALUES (gen_random_uuid(), $1, 'Overview Case', 'open', $2)
     RETURNING id`,
    [TENANT_ID, USER_ID],
  )) as { rows: { id: string }[] };

  const caseId = rows[0].id;

  await pg.query(
    `INSERT INTO maestro.case_graph_references (case_id, graph_entity_id, entity_label, entity_type, relationship_type, added_by)
     VALUES ($1, 'entity-1', 'Alpha', 'person', 'subject', $2),
            ($1, 'entity-1', 'Alpha', 'person', 'subject', $2),
            ($1, 'entity-2', 'Bravo', 'organization', 'related_to', $2)`,
    [caseId, USER_ID],
  );

  await pg.query(
    `INSERT INTO maestro.case_tasks (case_id, title, status, task_type, created_by)
     VALUES ($1, 'Collect evidence', 'completed', 'analysis', $2),
            ($1, 'Interview witness', 'pending', 'standard', $2)`,
    [caseId, USER_ID],
  );

  await pg.query(
    `INSERT INTO maestro.case_participants (case_id, user_id, role_id, assigned_by)
     VALUES ($1, $2, '00000000-0000-0000-0000-000000000001', $2)`,
    [caseId, USER_ID],
  );

  await pg.query(
    `INSERT INTO maestro.case_state_history (case_id, to_stage, to_status, transitioned_by, reason)
     VALUES ($1, 'intake', 'open', $2, 'seeded for overview cache')`,
    [caseId, USER_ID],
  );

  await pg.query(
    `INSERT INTO maestro.audit_access_logs (tenant_id, case_id, user_id, action, resource_type, resource_id, reason, legal_basis)
     VALUES ($1, $2, $3, 'view', 'case', $2, 'seed overview cache', 'investigation')`,
    [TENANT_ID, caseId, USER_ID],
  );

  return caseId;
}

async function cleanupCase(pg: Pool, caseId: string) {
  await pg.query('DELETE FROM maestro.case_graph_references WHERE case_id = $1', [caseId]);
  await pg.query('DELETE FROM maestro.case_tasks WHERE case_id = $1', [caseId]);
  await pg.query('DELETE FROM maestro.case_participants WHERE case_id = $1', [caseId]);
  await pg.query('DELETE FROM maestro.case_state_history WHERE case_id = $1', [caseId]);
  await pg.query('DELETE FROM maestro.audit_access_logs WHERE case_id = $1', [caseId]);
  await pg.query('DELETE FROM maestro.case_overview_cache WHERE case_id = $1', [caseId]);
  await pg.query('DELETE FROM maestro.cases WHERE id = $1', [caseId]);
}

const describeDatabase =
  process.env.ZERO_FOOTPRINT === 'true' ? describe.skip : describe;

describeDatabase('CaseOverviewService cache', () => {
  let pg: Pool;
  let service: CaseOverviewService;
  let repo: CaseOverviewCacheRepo;
  let caseId: string;

  beforeAll(async () => {
    pg = getPostgresPool();
    service = new CaseOverviewService(pg, { ttlMs: 100, staleWhileRevalidateMs: 200 });
    repo = new CaseOverviewCacheRepo(pg);
    caseId = await seedCase(pg);
  });

  afterAll(async () => {
    await cleanupCase(pg, caseId);
    await pg.end();
  });

  it('computes and caches overview metrics with hit-rate tracking', async () => {
    const first = await service.getOverview(caseId, TENANT_ID);
    expect(first.cache.status).toBe('miss');
    expect(first.entityCount).toBe(3); // two rows for entity-1 + one for entity-2
    expect(first.taskCount).toBe(2);
    expect(first.openTaskCount).toBe(1);
    expect(first.topEntities[0].graphEntityId).toBe('entity-1');

    const cacheRow = await repo.get(caseId, TENANT_ID);
    expect(cacheRow?.hitCount).toBe(0);
    expect(cacheRow?.missCount).toBe(1);

    const second = await service.getOverview(caseId, TENANT_ID);
    expect(second.cache.status).toBe('fresh');
    const cacheRowAfterHit = await repo.get(caseId, TENANT_ID);
    expect(cacheRowAfterHit?.hitCount).toBeGreaterThan(0);
  });

  it('serves stale data while revalidating in background', async () => {
    const initial = await service.getOverview(caseId, TENANT_ID);
    const initialRefreshedAt = initial.refreshedAt;

    await new Promise((resolve) => setTimeout(resolve, 150));
    const stale = await service.getOverview(caseId, TENANT_ID);
    expect(stale.cache.status).toBe('stale');

    await new Promise((resolve) => setTimeout(resolve, 200));
    const refreshed = await repo.get(caseId, TENANT_ID);
    expect(refreshed?.refreshedAt.getTime()).toBeGreaterThan(initialRefreshedAt.getTime());
  });

  it('rebuilds cache entries via rebuildAll', async () => {
    const rebuildCaseId = await seedCase(pg);
    await repo.delete(rebuildCaseId, TENANT_ID);

    const rebuiltCount = await service.rebuildAll(10);
    expect(rebuiltCount).toBeGreaterThan(0);

    const rebuilt = await repo.get(rebuildCaseId, TENANT_ID);
    expect(rebuilt).toBeDefined();

    await cleanupCase(pg, rebuildCaseId);
  });

  it('invalidates cache safely and repopulates on demand', async () => {
    await service.invalidate(caseId, TENANT_ID);
    const afterInvalidate = await repo.get(caseId, TENANT_ID);
    expect(afterInvalidate).toBeNull();

    const repopulated = await service.getOverview(caseId, TENANT_ID);
    expect(repopulated.cache.status).toBe('miss');
  });

  it('marks entries stale for event-driven refresh and processes them via refreshStale', async () => {
    const initial = await service.getOverview(caseId, TENANT_ID);
    await service.markStale(caseId, TENANT_ID);

    const staleTargets = await repo.listCasesNeedingRefresh();
    expect(staleTargets.some((target) => target.caseId === caseId)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const refreshedCount = await service.refreshStale();
    expect(refreshedCount).toBeGreaterThan(0);

    const refreshed = await repo.get(caseId, TENANT_ID);
    expect(refreshed?.refreshedAt.getTime()).toBeGreaterThan(initial.refreshedAt.getTime());
    expect(refreshed?.refreshStatus).toBe('fresh');
  });
});
