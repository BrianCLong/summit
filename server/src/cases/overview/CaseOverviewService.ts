// @ts-nocheck
import { Pool } from 'pg';
import { CaseOverviewCacheRepo, CaseOverviewSnapshot } from '../../repos/CaseOverviewCacheRepo.js';
import logger from '../../config/logger.js';

export interface CaseOverviewOptions {
  ttlMs?: number;
  staleWhileRevalidateMs?: number;
  metricsSampleSize?: number;
}

export interface CaseOverviewResponse extends CaseOverviewSnapshot {
  cache: {
    status: string;
    hitCount: number;
    missCount: number;
  };
}

const overviewLogger = logger.child({ name: 'CaseOverviewService' });

export class CaseOverviewService {
  private cacheRepo: CaseOverviewCacheRepo;
  private ttlMs: number;
  private staleWhileRevalidateMs: number;
  private inflight: Map<string, Promise<CaseOverviewSnapshot>> = new Map();

  constructor(private pg: Pool, options?: CaseOverviewOptions) {
    this.cacheRepo = new CaseOverviewCacheRepo(pg);
    this.ttlMs = options?.ttlMs ?? 5 * 60 * 1000; // 5 minutes
    this.staleWhileRevalidateMs = options?.staleWhileRevalidateMs ?? 10 * 60 * 1000; // 10 minutes
  }

  async getOverview(caseId: string, tenantId: string): Promise<CaseOverviewResponse> {
    const cacheKey = `${tenantId}:${caseId}`;
    const cached = await this.cacheRepo.get(caseId, tenantId);
    const now = new Date();

    if (cached) {
      await this.cacheRepo.recordHit(caseId, tenantId);
      if (cached.expiresAt > now) {
        return this.decorate(cached, 'fresh');
      }

      const staleDeadline = new Date(cached.expiresAt.getTime() + this.staleWhileRevalidateMs);
      if (now <= staleDeadline) {
        this.triggerRevalidation(cacheKey, caseId, tenantId);
        return this.decorate({ ...cached, refreshStatus: 'revalidating' }, 'stale');
      }
    }

    const snapshot = await this.refresh(caseId, tenantId, cacheKey);
    await this.cacheRepo.recordMiss(caseId, tenantId);
    return this.decorate(snapshot, 'miss');
  }

  async refresh(caseId: string, tenantId: string, cacheKey?: string): Promise<CaseOverviewSnapshot> {
    const key = cacheKey ?? `${tenantId}:${caseId}`;

    if (this.inflight.has(key)) {
      return this.inflight.get(key)!;
    }

    const promise = this.buildSnapshot(caseId, tenantId)
      .then((snapshot) => this.cacheRepo.upsert(snapshot))
      .catch((error) => {
        overviewLogger.error({ error, caseId, tenantId }, 'Failed to refresh case overview');
        throw error;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  async invalidate(caseId: string, tenantId: string): Promise<void> {
    await this.cacheRepo.delete(caseId, tenantId);
  }

  async rebuildAll(limit = 500): Promise<number> {
    const cases = await this.cacheRepo.listAllCases(limit);
    for (const entry of cases) {
      await this.refresh(entry.caseId, entry.tenantId);
    }
    return cases.length;
  }

  async refreshStale(limit = 50): Promise<number> {
    const targets = await this.cacheRepo.listCasesNeedingRefresh(limit);
    for (const target of targets) {
      await this.refresh(target.caseId, target.tenantId);
    }
    return targets.length;
  }

  async markStale(caseId: string, tenantId: string): Promise<void> {
    await this.cacheRepo.markStale(caseId, tenantId);
  }

  private async triggerRevalidation(cacheKey: string, caseId: string, tenantId: string): Promise<void> {
    if (this.inflight.has(cacheKey)) return;
    void this.refresh(caseId, tenantId, cacheKey);
  }

  private async buildSnapshot(caseId: string, tenantId: string): Promise<CaseOverviewSnapshot> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);

    const metricsRow = await this.pg.query<{
      entity_count: number;
      task_count: number;
      open_task_count: number;
      participant_count: number;
      transition_count: number;
      audit_event_count: number;
      last_activity_at: Date | null;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM maestro.case_graph_references WHERE case_id = $1 AND is_active = true) AS entity_count,
        (SELECT COUNT(*) FROM maestro.case_tasks WHERE case_id = $1) AS task_count,
        (SELECT COUNT(*) FROM maestro.case_tasks WHERE case_id = $1 AND status NOT IN ('completed', 'cancelled')) AS open_task_count,
        (SELECT COUNT(*) FROM maestro.case_participants WHERE case_id = $1 AND is_active = true) AS participant_count,
        (SELECT COUNT(*) FROM maestro.case_state_history WHERE case_id = $1) AS transition_count,
        (SELECT COUNT(*) FROM maestro.audit_access_logs WHERE case_id = $1) AS audit_event_count,
        GREATEST(
          COALESCE((SELECT MAX(updated_at) FROM maestro.case_tasks WHERE case_id = $1), to_timestamp(0)),
          COALESCE((SELECT MAX(transitioned_at) FROM maestro.case_state_history WHERE case_id = $1), to_timestamp(0)),
          COALESCE((SELECT MAX(created_at) FROM maestro.audit_access_logs WHERE case_id = $1), to_timestamp(0)),
          COALESCE((SELECT MAX(added_at) FROM maestro.case_graph_references WHERE case_id = $1), to_timestamp(0))
        ) AS last_activity_at`,
      [caseId],
    );

    const metrics =
      metricsRow.rows[0] ||
      ({
        entity_count: 0,
        task_count: 0,
        open_task_count: 0,
        participant_count: 0,
        transition_count: 0,
        audit_event_count: 0,
        last_activity_at: null,
      } as const);

    const { rows: topEntityRows } = await this.pg.query<{
      graph_entity_id: string;
      entity_label: string;
      entity_type: string | null;
      relationship_type: string | null;
      count: number;
    }>(
      `SELECT graph_entity_id, entity_label, entity_type, relationship_type, COUNT(*) as count
       FROM maestro.case_graph_references
       WHERE case_id = $1 AND is_active = true
       GROUP BY graph_entity_id, entity_label, entity_type, relationship_type
       ORDER BY COUNT(*) DESC, entity_label ASC
       LIMIT 5`,
      [caseId],
    );

    return {
      caseId,
      tenantId,
      entityCount: Number(metrics.entity_count || 0),
      taskCount: Number(metrics.task_count || 0),
      openTaskCount: Number(metrics.open_task_count || 0),
      participantCount: Number(metrics.participant_count || 0),
      transitionCount: Number(metrics.transition_count || 0),
      auditEventCount: Number(metrics.audit_event_count || 0),
      topEntities: topEntityRows.map((row: any) => ({
        graphEntityId: row.graph_entity_id,
        entityLabel: row.entity_label,
        entityType: row.entity_type,
        relationshipType: row.relationship_type,
        count: Number(row.count),
      })),
      lastActivityAt: metrics.last_activity_at && metrics.last_activity_at.getTime() > 0
        ? metrics.last_activity_at
        : null,
      refreshedAt: now,
      expiresAt,
      refreshStatus: 'fresh',
      hitCount: 0,
      missCount: 0,
      stale: false,
    };
  }

  private decorate(snapshot: CaseOverviewSnapshot, status: 'fresh' | 'stale' | 'miss'): CaseOverviewResponse {
    return {
      ...snapshot,
      cache: {
        status,
        hitCount: snapshot.hitCount,
        missCount: snapshot.missCount,
      },
    };
  }
}
