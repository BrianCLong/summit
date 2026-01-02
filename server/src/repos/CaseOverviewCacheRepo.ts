// @ts-nocheck
import { Pool } from 'pg';

export type RefreshStatus = 'fresh' | 'revalidating' | 'stale';

export interface CaseOverviewTopEntity {
  graphEntityId: string;
  entityLabel: string;
  entityType: string | null;
  relationshipType: string | null;
  count: number;
}

export interface CaseOverviewSnapshot {
  caseId: string;
  tenantId: string;
  entityCount: number;
  taskCount: number;
  openTaskCount: number;
  participantCount: number;
  transitionCount: number;
  auditEventCount: number;
  topEntities: CaseOverviewTopEntity[];
  lastActivityAt: Date | null;
  refreshedAt: Date;
  expiresAt: Date;
  refreshStatus: RefreshStatus;
  hitCount: number;
  missCount: number;
  stale: boolean;
}

interface CaseOverviewCacheRow {
  case_id: string;
  tenant_id: string;
  entity_count: number;
  task_count: number;
  open_task_count: number;
  participant_count: number;
  transition_count: number;
  audit_event_count: number;
  top_entities: CaseOverviewTopEntity[];
  last_activity_at: Date | null;
  refreshed_at: Date;
  expires_at: Date;
  refresh_status: RefreshStatus;
  hit_count: number;
  miss_count: number;
  last_hit_at?: Date | null;
  last_miss_at?: Date | null;
}

export class CaseOverviewCacheRepo {
  constructor(private pg: Pool) {}

  async get(caseId: string, tenantId: string): Promise<CaseOverviewSnapshot | null> {
    const { rows } = await this.pg.query<CaseOverviewCacheRow>(
      `SELECT * FROM maestro.case_overview_cache WHERE case_id = $1 AND tenant_id = $2`,
      [caseId, tenantId],
    );

    if (!rows[0]) return null;
    return this.mapRow(rows[0]);
  }

  async upsert(snapshot: Omit<CaseOverviewSnapshot, 'hitCount' | 'missCount' | 'stale'> & {
    hitCount?: number;
    missCount?: number;
  }): Promise<CaseOverviewSnapshot> {
    const { rows } = await this.pg.query<CaseOverviewCacheRow>(
      `INSERT INTO maestro.case_overview_cache (
        case_id, tenant_id, entity_count, task_count, open_task_count, participant_count,
        transition_count, audit_event_count, top_entities, last_activity_at, refreshed_at, expires_at,
        refresh_status, hit_count, miss_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, COALESCE($14, 0), COALESCE($15, 0)
      )
      ON CONFLICT (case_id, tenant_id) DO UPDATE SET
        entity_count = EXCLUDED.entity_count,
        task_count = EXCLUDED.task_count,
        open_task_count = EXCLUDED.open_task_count,
        participant_count = EXCLUDED.participant_count,
        transition_count = EXCLUDED.transition_count,
        audit_event_count = EXCLUDED.audit_event_count,
        top_entities = EXCLUDED.top_entities,
        last_activity_at = EXCLUDED.last_activity_at,
        refreshed_at = EXCLUDED.refreshed_at,
        expires_at = EXCLUDED.expires_at,
        refresh_status = EXCLUDED.refresh_status,
        hit_count = maestro.case_overview_cache.hit_count,
        miss_count = maestro.case_overview_cache.miss_count
      RETURNING *`,
      [
        snapshot.caseId,
        snapshot.tenantId,
        snapshot.entityCount,
        snapshot.taskCount,
        snapshot.openTaskCount,
        snapshot.participantCount,
        snapshot.transitionCount,
        snapshot.auditEventCount,
        JSON.stringify(snapshot.topEntities || []),
        snapshot.lastActivityAt,
        snapshot.refreshedAt,
        snapshot.expiresAt,
        snapshot.refreshStatus,
        snapshot.hitCount,
        snapshot.missCount,
      ],
    );

    const row = rows[0];
    return this.mapRow({ ...row, hit_count: snapshot.hitCount ?? row.hit_count, miss_count: snapshot.missCount ?? row.miss_count });
  }

  async recordHit(caseId: string, tenantId: string): Promise<void> {
    await this.pg.query(
      `UPDATE maestro.case_overview_cache
       SET hit_count = hit_count + 1, last_hit_at = NOW()
       WHERE case_id = $1 AND tenant_id = $2`,
      [caseId, tenantId],
    );
  }

  async recordMiss(caseId: string, tenantId: string): Promise<void> {
    await this.pg.query(
      `UPDATE maestro.case_overview_cache
       SET miss_count = miss_count + 1, last_miss_at = NOW()
       WHERE case_id = $1 AND tenant_id = $2`,
      [caseId, tenantId],
    );
  }

  async markStale(caseId: string, tenantId: string): Promise<void> {
    await this.pg.query(
      `UPDATE maestro.case_overview_cache
       SET refresh_status = 'stale', expires_at = NOW()
       WHERE case_id = $1 AND tenant_id = $2`,
      [caseId, tenantId],
    );
  }

  async delete(caseId: string, tenantId: string): Promise<void> {
    await this.pg.query(`DELETE FROM maestro.case_overview_cache WHERE case_id = $1 AND tenant_id = $2`, [caseId, tenantId]);
  }

  async listCasesNeedingRefresh(limit = 50): Promise<{ caseId: string; tenantId: string }[]> {
    const { rows } = await this.pg.query<{ case_id: string; tenant_id: string }>(
      `SELECT case_id, tenant_id
       FROM maestro.case_overview_cache
       WHERE expires_at <= NOW() OR refresh_status = 'stale'
       ORDER BY expires_at ASC
       LIMIT $1`,
      [limit],
    );

    return rows.map((row: any) => ({ caseId: row.case_id, tenantId: row.tenant_id }));
  }

  async listAllCases(limit = 500): Promise<{ caseId: string; tenantId: string }[]> {
    const { rows } = await this.pg.query<{ id: string; tenant_id: string }>(
      `SELECT id, tenant_id FROM maestro.cases ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map((row: any) => ({ caseId: row.id, tenantId: row.tenant_id }));
  }

  private mapRow(row: CaseOverviewCacheRow): CaseOverviewSnapshot {
    const topEntities = Array.isArray(row.top_entities)
      ? row.top_entities
      : typeof row.top_entities === 'string'
        ? (JSON.parse(row.top_entities) as CaseOverviewTopEntity[])
        : [];

    return {
      caseId: row.case_id,
      tenantId: row.tenant_id,
      entityCount: row.entity_count,
      taskCount: row.task_count,
      openTaskCount: row.open_task_count,
      participantCount: row.participant_count,
      transitionCount: row.transition_count,
      auditEventCount: row.audit_event_count,
      topEntities,
      lastActivityAt: row.last_activity_at,
      refreshedAt: row.refreshed_at,
      expiresAt: row.expires_at,
      refreshStatus: row.refresh_status,
      hitCount: row.hit_count,
      missCount: row.miss_count,
      stale: row.expires_at < new Date() || row.refresh_status === 'stale',
    };
  }
}
