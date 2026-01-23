import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../db/postgres.js';
import { CaseOverviewCacheRepo } from '../../repos/CaseOverviewCacheRepo.js';

const TENANT_ID = 'tenant-case-overview-route';
const USER_ID = 'case-overview-route-user';
const describeIfDb =
  process.env.ZERO_FOOTPRINT === 'true' ? describe.skip : describe;

async function seedCase(pg: Pool): Promise<string> {
  const { rows } = (await pg.query(
    `INSERT INTO maestro.cases (id, tenant_id, title, status, created_by)
     VALUES (gen_random_uuid(), $1, 'Overview Case Route', 'open', $2)
     RETURNING id`,
    [TENANT_ID, USER_ID],
  )) as { rows: Array<{ id: string }> };

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
     VALUES ($1, 'intake', 'open', $2, 'seeded for overview cache route')`,
    [caseId, USER_ID],
  );

  await pg.query(
    `INSERT INTO maestro.audit_access_logs (tenant_id, case_id, user_id, action, resource_type, resource_id, reason, legal_basis)
     VALUES ($1, $2, $3, 'view', 'case', $2, 'seed overview cache route', 'investigation')`,
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

describeIfDb('GET /api/cases/:id/overview', () => {
  let app: express.Express;
  let pg: Pool;
  let repo: CaseOverviewCacheRepo;
  let caseId: string;

  beforeAll(async () => {
    process.env.CASE_OVERVIEW_CACHE_TTL_MS = '50';
    process.env.CASE_OVERVIEW_CACHE_SWR_MS = '100';
    jest.resetModules();

    pg = getPostgresPool();
    repo = new CaseOverviewCacheRepo(pg);
    caseId = await seedCase(pg);

    const routerModule = await import('../cases.js');
    const router = routerModule.default ?? routerModule.caseRouter;

    app = express();
    app.use(express.json());
    app.use('/api/cases', router);
  });

  afterAll(async () => {
    delete process.env.CASE_OVERVIEW_CACHE_TTL_MS;
    delete process.env.CASE_OVERVIEW_CACHE_SWR_MS;
    await cleanupCase(pg, caseId);
    await pg.end();
  });

  it('serves cached overview with hit/miss tracking', async () => {
    const first = await request(app)
      .get(`/api/cases/${caseId}/overview`)
      .query({ reason: 'testing overview', legalBasis: 'investigation' })
      .set('x-tenant-id', TENANT_ID)
      .set('x-user-id', USER_ID);

    expect(first.status).toBe(200);
    expect(first.body.cache.status).toBe('miss');

    const cacheAfterMiss = await repo.get(caseId, TENANT_ID);
    expect(cacheAfterMiss?.missCount).toBeGreaterThanOrEqual(1);

    const second = await request(app)
      .get(`/api/cases/${caseId}/overview`)
      .query({ reason: 'testing overview', legalBasis: 'investigation' })
      .set('x-tenant-id', TENANT_ID)
      .set('x-user-id', USER_ID);

    expect(second.status).toBe(200);
    expect(second.body.cache.status).toBe('fresh');

    const cacheAfterHit = await repo.get(caseId, TENANT_ID);
    expect(cacheAfterHit?.hitCount).toBeGreaterThanOrEqual(1);
  });

  it('uses stale-while-revalidate to refresh in the background', async () => {
    const priming = await request(app)
      .get(`/api/cases/${caseId}/overview`)
      .query({ reason: 'priming overview cache', legalBasis: 'investigation' })
      .set('x-tenant-id', TENANT_ID)
      .set('x-user-id', USER_ID);

    expect(priming.status).toBe(200);
    const initialRefreshedAt = new Date(priming.body.refreshedAt);

    await new Promise((resolve) => setTimeout(resolve, 70));

    const stale = await request(app)
      .get(`/api/cases/${caseId}/overview`)
      .query({ reason: 'stale access', legalBasis: 'investigation' })
      .set('x-tenant-id', TENANT_ID)
      .set('x-user-id', USER_ID);

    expect(stale.status).toBe(200);
    expect(stale.body.cache.status).toBe('stale');
    expect(stale.body.refreshStatus).toBe('revalidating');

    await new Promise((resolve) => setTimeout(resolve, 150));

    const refreshed = await repo.get(caseId, TENANT_ID);
    expect(refreshed?.refreshedAt.getTime()).toBeGreaterThan(initialRefreshedAt.getTime());
    expect(refreshed?.refreshStatus).toBe('fresh');
  });
});
