import { trace, SpanStatusCode } from '@opentelemetry/api';
import baseLogger from '../config/logger';
import { pg } from '../db/pg';

type PgClient = typeof pg;

export interface UserActivitySummaryPoint {
  date: string;
  loginCount: number;
  queryCount: number;
}

export interface UserActivityTopUser {
  userId: string;
  loginCount: number;
  queryCount: number;
  lastActiveAt: string | null;
}

export interface UserActivitySummaryResult {
  totalLogins: number;
  totalQueries: number;
  uniqueUsers: number;
  activeUsersByDay: UserActivitySummaryPoint[];
  topUsers: UserActivityTopUser[];
}

export interface UserActivityEvent {
  timestamp: string;
  type: string;
  userId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface UserActivitySummaryInput {
  tenantId: string | null;
  rangeStart: string;
  rangeEnd: string;
}

const tracer = trace.getTracer('user-activity-analytics');
const logger = baseLogger.child({ name: 'UserActivityAnalyticsService' });

export class UserActivityAnalyticsService {
  constructor(private readonly client: PgClient = pg) {}

  async getSummary({ tenantId, rangeStart, rangeEnd }: UserActivitySummaryInput): Promise<UserActivitySummaryResult> {
    return tracer.startActiveSpan('UserActivityAnalyticsService.getSummary', async (span) => {
      try {
        span.setAttributes({
          'analytics.tenant_id': tenantId ?? 'all',
          'analytics.range_start': rangeStart,
          'analytics.range_end': rangeEnd,
        });

        const loginRows = await this.fetchLoginActivity(tenantId, rangeStart, rangeEnd);
        const queryRows = await this.fetchQueryActivity(rangeStart, rangeEnd);
        const topLoginUsers = await this.fetchTopLoginUsers(tenantId, rangeStart, rangeEnd);
        const topQueryUsers = await this.fetchTopQueryUsers(rangeStart, rangeEnd);

        const activityByDate = new Map<string, { login: number; query: number }>();
        const uniqueUserIds = new Set<string>();

        for (const row of loginRows) {
          const date = row.activity_date || row.activityDate;
          const normalizedDate = typeof date === 'string' ? date : new Date(date).toISOString();
          const loginCount = Number(row.login_count ?? row.logins ?? 0);
          const existing = activityByDate.get(normalizedDate) ?? { login: 0, query: 0 };
          activityByDate.set(normalizedDate, { ...existing, login: existing.login + loginCount });
          if (Array.isArray(row.user_ids)) {
            row.user_ids.filter(Boolean).forEach((id: string) => uniqueUserIds.add(id));
          }
        }

        for (const row of queryRows) {
          const date = row.activity_date || row.activityDate || row.query_date;
          const normalizedDate = typeof date === 'string' ? date : new Date(date).toISOString();
          const queryCount = Number(row.query_count ?? row.total_queries ?? row.count ?? 0);
          const existing = activityByDate.get(normalizedDate) ?? { login: 0, query: 0 };
          activityByDate.set(normalizedDate, { ...existing, query: existing.query + queryCount });
          if (Array.isArray(row.user_ids)) {
            row.user_ids.filter(Boolean).forEach((id: string) => uniqueUserIds.add(id));
          }
          if (row.created_by) {
            uniqueUserIds.add(row.created_by);
          }
        }

        const summaryPoints = Array.from(activityByDate.entries())
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([date, counts]) => ({
            date: date,
            loginCount: counts.login,
            queryCount: counts.query,
          }));

        const totalLogins = loginRows.reduce(
          (acc: number, row: any) => acc + Number(row.login_count ?? row.logins ?? row.count ?? 0),
          0,
        );
        const totalQueries = queryRows.reduce(
          (acc: number, row: any) => acc + Number(row.query_count ?? row.total_queries ?? row.count ?? 0),
          0,
        );

        const combinedTopUsers = this.mergeTopUsers(topLoginUsers, topQueryUsers);

        span.addEvent('user_activity.summary_ready', {
          'analytics.total_logins': totalLogins,
          'analytics.total_queries': totalQueries,
          'analytics.unique_users': uniqueUserIds.size,
          'analytics.points': summaryPoints.length,
        });

        return {
          totalLogins,
          totalQueries,
          uniqueUsers: uniqueUserIds.size,
          activeUsersByDay: summaryPoints,
          topUsers: combinedTopUsers,
        };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error({ err: error }, 'Failed to build user activity summary');
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getRecentActivity(
    tenantId: string | null,
    rangeStart: string,
    rangeEnd: string,
    limit: number,
  ): Promise<UserActivityEvent[]> {
    return tracer.startActiveSpan('UserActivityAnalyticsService.getRecentActivity', async (span) => {
      try {
        span.setAttributes({
          'analytics.tenant_id': tenantId ?? 'all',
          'analytics.range_start': rangeStart,
          'analytics.range_end': rangeEnd,
          'analytics.limit': limit,
        });

        const candidates = [
          {
            sql: `SELECT
             COALESCE(created_at, timestamp) as event_time,
             COALESCE(type, action, event_type, resource_type) as event_type,
             COALESCE(actor_id, user_id, meta->>'userId', metadata->>'userId') as actor_id,
             COALESCE(meta, metadata, resource_data, new_values, old_values) as metadata
           FROM audit_events
           WHERE COALESCE(created_at, timestamp) BETWEEN $1 AND $2
             AND ($3::text IS NULL OR
                  COALESCE(tenant_id::text, meta->>'tenantId', metadata->>'tenantId', resource_data->>'tenantId') = $3)
           ORDER BY COALESCE(created_at, timestamp) DESC
           LIMIT $4`,
            params: [rangeStart, rangeEnd, tenantId, limit],
            tenantIdIndex: 2,
          },
          {
            sql: `SELECT
             COALESCE(created_at, timestamp) as event_time,
             COALESCE(type, action, event_type, resource_type) as event_type,
             COALESCE(actor_id, user_id, meta->>'userId') as actor_id,
             COALESCE(meta, metadata) as metadata
           FROM audit_events
           WHERE COALESCE(created_at, timestamp) BETWEEN $1 AND $2
           ORDER BY COALESCE(created_at, timestamp) DESC
           LIMIT $3`,
            params: [rangeStart, rangeEnd, limit],
          },
        ];

        const rows = await this.executeReadMany(candidates);
        span.addEvent('user_activity.recent_loaded', { 'analytics.events': rows.length });

        return rows.map((row: any) => ({
          timestamp: this.normalizeDate(row.event_time),
          type: (row.event_type || 'event').toString(),
          userId: row.actor_id || null,
          metadata: this.normalizeMetadata(row.metadata),
        }));
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error({ err: error }, 'Failed to fetch recent activity');
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async fetchLoginActivity(tenantId: string | null, rangeStart: string, rangeEnd: string) {
    const candidates = [
      {
        sql: `SELECT
         DATE_TRUNC('day', COALESCE(created_at, timestamp)) AS activity_date,
         COUNT(*) FILTER (
           WHERE LOWER(COALESCE(type, action, event_type, resource_type)) LIKE 'login%'
             OR LOWER(COALESCE(meta->>'eventType', metadata->>'eventType')) LIKE 'login%'
         ) AS login_count,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(actor_id, user_id, meta->>'userId', metadata->>'userId')), NULL) AS user_ids
       FROM audit_events
       WHERE COALESCE(created_at, timestamp) BETWEEN $1 AND $2
         AND ($3::text IS NULL OR
              COALESCE(tenant_id::text, meta->>'tenantId', metadata->>'tenantId', resource_data->>'tenantId') = $3)
       GROUP BY 1
       ORDER BY 1 ASC`,
        params: [rangeStart, rangeEnd, tenantId],
        tenantIdIndex: 2,
      },
      {
        sql: `SELECT
         DATE_TRUNC('day', COALESCE(created_at, timestamp)) AS activity_date,
         COUNT(*) FILTER (
           WHERE LOWER(COALESCE(type, action, event_type, resource_type)) LIKE 'login%'
         ) AS login_count,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(actor_id, user_id, meta->>'userId')), NULL) AS user_ids
       FROM audit_events
       WHERE COALESCE(created_at, timestamp) BETWEEN $1 AND $2
       GROUP BY 1
       ORDER BY 1 ASC`,
        params: [rangeStart, rangeEnd],
      },
    ];

    return await this.executeReadMany(candidates);
  }

  private async fetchQueryActivity(rangeStart: string, rangeEnd: string) {
    const candidates = [
      {
        sql: `SELECT
         DATE_TRUNC('day', created_at) AS activity_date,
         COUNT(*) AS query_count,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT created_by), NULL) AS user_ids
       FROM nl_cypher_translations
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY 1
       ORDER BY 1 ASC`,
        params: [rangeStart, rangeEnd],
      },
    ];

    return await this.executeReadMany(candidates);
  }

  private async fetchTopLoginUsers(tenantId: string | null, rangeStart: string, rangeEnd: string) {
    const candidates = [
      {
        sql: `SELECT
         COALESCE(actor_id, user_id, meta->>'userId', metadata->>'userId') AS user_id,
         COUNT(*) FILTER (
           WHERE LOWER(COALESCE(type, action, event_type, resource_type)) LIKE 'login%'
             OR LOWER(COALESCE(meta->>'eventType', metadata->>'eventType')) LIKE 'login%'
         ) AS login_count,
         MAX(COALESCE(created_at, timestamp)) AS last_active
       FROM audit_events
       WHERE COALESCE(created_at, timestamp) BETWEEN $1 AND $2
         AND ($3::text IS NULL OR
              COALESCE(tenant_id::text, meta->>'tenantId', metadata->>'tenantId', resource_data->>'tenantId') = $3)
       GROUP BY 1
       HAVING COALESCE(COUNT(*) FILTER (
         WHERE LOWER(COALESCE(type, action, event_type, resource_type)) LIKE 'login%'
           OR LOWER(COALESCE(meta->>'eventType', metadata->>'eventType')) LIKE 'login%'
       ), 0) > 0
       ORDER BY login_count DESC, last_active DESC
       LIMIT 10`,
        params: [rangeStart, rangeEnd, tenantId],
        tenantIdIndex: 2,
      },
      {
        sql: `SELECT
         COALESCE(actor_id, user_id, meta->>'userId') AS user_id,
         COUNT(*) FILTER (
           WHERE LOWER(COALESCE(type, action, event_type, resource_type)) LIKE 'login%'
         ) AS login_count,
         MAX(COALESCE(created_at, timestamp)) AS last_active
       FROM audit_events
       WHERE COALESCE(created_at, timestamp) BETWEEN $1 AND $2
       GROUP BY 1
       HAVING COUNT(*) FILTER (
         WHERE LOWER(COALESCE(type, action, event_type, resource_type)) LIKE 'login%'
       ) > 0
       ORDER BY login_count DESC, last_active DESC
       LIMIT 10`,
        params: [rangeStart, rangeEnd],
      },
    ];

    return await this.executeReadMany(candidates);
  }

  private async fetchTopQueryUsers(rangeStart: string, rangeEnd: string) {
    const candidates = [
      {
        sql: `SELECT
         created_by AS user_id,
         COUNT(*) AS query_count,
         MAX(created_at) AS last_active
       FROM nl_cypher_translations
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY 1
       ORDER BY query_count DESC, last_active DESC
       LIMIT 10`,
        params: [rangeStart, rangeEnd],
      },
    ];

    return await this.executeReadMany(candidates);
  }

  private mergeTopUsers(loginRows: any[], queryRows: any[]): UserActivityTopUser[] {
    const combined = new Map<string, UserActivityTopUser>();

    for (const row of loginRows) {
      const userId = row.user_id || row.actor_id;
      if (!userId) continue;
      combined.set(userId, {
        userId,
        loginCount: Number(row.login_count ?? row.count ?? 0),
        queryCount: 0,
        lastActiveAt: this.normalizeDate(row.last_active),
      });
    }

    for (const row of queryRows) {
      const userId = row.user_id || row.created_by;
      if (!userId) continue;
      const existing = combined.get(userId) || {
        userId,
        loginCount: 0,
        queryCount: 0,
        lastActiveAt: null,
      };
      existing.queryCount += Number(row.query_count ?? row.count ?? 0);
      const candidateDate = this.normalizeDate(row.last_active);
      if (candidateDate && (!existing.lastActiveAt || existing.lastActiveAt < candidateDate)) {
        existing.lastActiveAt = candidateDate;
      }
      combined.set(userId, existing);
    }

    return Array.from(combined.values()).sort((a, b) => {
      const totalA = a.loginCount + a.queryCount;
      const totalB = b.loginCount + b.queryCount;
      if (totalA === totalB) {
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return bTime - aTime;
      }
      return totalB - totalA;
    });
  }

  private async executeReadMany(
    statements: Array<{ sql: string; params: any[]; tenantIdIndex?: number }>,
  ) {
    const errors: Error[] = [];
    for (const candidate of statements) {
      try {
        const tenantId =
          typeof candidate.tenantIdIndex === 'number'
            ? candidate.params[candidate.tenantIdIndex] ?? undefined
            : undefined;
        const rows = await this.client.readMany(candidate.sql, candidate.params as any[], {
          tenantId,
        });
        tracer.addEvent('user_activity.sql_success', {
          'analytics.statement': candidate.sql.replace(/\s+/g, ' ').trim().slice(0, 120),
          'analytics.row_count': rows.length,
        });
        return rows;
      } catch (error) {
        errors.push(error as Error);
        logger.debug({ err: error, statement: candidate.sql }, 'User activity query variant failed, trying next');
      }
    }
    const message = errors.length
      ? errors.map((err) => err.message).join('; ')
      : 'No query candidates succeeded';
    throw new Error(`Failed to execute analytics query: ${message}`);
  }

  private normalizeDate(value: any): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private normalizeMetadata(value: any): Record<string, unknown> | null {
    if (!value) return null;
    if (typeof value === 'object') return value as Record<string, unknown>;
    try {
      return JSON.parse(value);
    } catch {
      return { value: String(value) };
    }
  }
}
