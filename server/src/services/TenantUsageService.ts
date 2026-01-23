import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';

export type UsageRangeKey =
  | '24h'
  | '7d'
  | '30d'
  | '90d'
  | 'month'
  | 'quarter'
  | 'year';

export interface UsageRange {
  key: UsageRangeKey;
  start: Date;
  end: Date;
}

export interface UsageTotal {
  kind: string;
  unit: string;
  total: number;
}

export interface UsageBreakdownGroup {
  totals: UsageTotal[];
}

export interface WorkflowBreakdown extends UsageBreakdownGroup {
  workflow: string;
}

export interface EnvironmentBreakdown extends UsageBreakdownGroup {
  environment: string;
}

export interface WorkflowEnvironmentBreakdown extends UsageBreakdownGroup {
  workflow: string;
  environment: string;
}

export interface TenantUsageSummary {
  tenantId: string;
  range: {
    key: UsageRangeKey;
    start: string;
    end: string;
  };
  totals: UsageTotal[];
  breakdown: {
    byWorkflow: WorkflowBreakdown[];
    byEnvironment: EnvironmentBreakdown[];
    byWorkflowEnvironment: WorkflowEnvironmentBreakdown[];
  };
}

type UsageAggregateRow = {
  kind: string;
  unit: string;
  total_quantity: number | string;
};

type WorkflowAggregateRow = UsageAggregateRow & {
  workflow: string;
};

type EnvironmentAggregateRow = UsageAggregateRow & {
  environment: string;
};

type WorkflowEnvironmentAggregateRow = UsageAggregateRow & {
  workflow: string;
  environment: string;
};

const rangeOrder: UsageRangeKey[] = [
  '24h',
  '7d',
  '30d',
  '90d',
  'month',
  'quarter',
  'year',
];

export class TenantUsageService {
  private get pool() {
    return getPostgresPool();
  }

  getUsageRange(range?: string): UsageRange {
    const key = (range || '30d') as UsageRangeKey;
    if (!rangeOrder.includes(key)) {
      throw new Error(`Invalid range: ${range}`);
    }

    const end = new Date();
    let start = new Date(end);

    if (key === '24h') {
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    } else if (key === '7d') {
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (key === '30d') {
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (key === '90d') {
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (key === 'month') {
      start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    } else if (key === 'quarter') {
      const quarterStartMonth = Math.floor(end.getUTCMonth() / 3) * 3;
      start = new Date(Date.UTC(end.getUTCFullYear(), quarterStartMonth, 1));
    } else if (key === 'year') {
      start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
    }

    return { key, start, end };
  }

  async getTenantUsage(
    tenantId: string,
    range?: string,
  ): Promise<TenantUsageSummary> {
    const { key, start, end } = this.getUsageRange(range);

    try {
      const totalsResult = await this.pool.read(
        `
          SELECT kind, unit, SUM(quantity) AS total_quantity
          FROM usage_events
          WHERE tenant_id = $1
            AND occurred_at >= $2
            AND occurred_at <= $3
          GROUP BY kind, unit
          ORDER BY kind
        `,
        [tenantId, start.toISOString(), end.toISOString()],
      );

      const workflowResult = await this.pool.read(
        `
          SELECT
            COALESCE(metadata->>'workflow', 'unknown') AS workflow,
            kind,
            unit,
            SUM(quantity) AS total_quantity
          FROM usage_events
          WHERE tenant_id = $1
            AND occurred_at >= $2
            AND occurred_at <= $3
          GROUP BY workflow, kind, unit
          ORDER BY workflow, kind
        `,
        [tenantId, start.toISOString(), end.toISOString()],
      );

      const environmentResult = await this.pool.read(
        `
          SELECT
            COALESCE(metadata->>'environment', 'unknown') AS environment,
            kind,
            unit,
            SUM(quantity) AS total_quantity
          FROM usage_events
          WHERE tenant_id = $1
            AND occurred_at >= $2
            AND occurred_at <= $3
          GROUP BY environment, kind, unit
          ORDER BY environment, kind
        `,
        [tenantId, start.toISOString(), end.toISOString()],
      );

      const workflowEnvironmentResult = await this.pool.read(
        `
          SELECT
            COALESCE(metadata->>'workflow', 'unknown') AS workflow,
            COALESCE(metadata->>'environment', 'unknown') AS environment,
            kind,
            unit,
            SUM(quantity) AS total_quantity
          FROM usage_events
          WHERE tenant_id = $1
            AND occurred_at >= $2
            AND occurred_at <= $3
          GROUP BY workflow, environment, kind, unit
          ORDER BY workflow, environment, kind
        `,
        [tenantId, start.toISOString(), end.toISOString()],
      );

      const totalsRows = totalsResult.rows as UsageAggregateRow[];
      const workflowRows = workflowResult.rows as WorkflowAggregateRow[];
      const environmentRows = environmentResult.rows as EnvironmentAggregateRow[];
      const workflowEnvironmentRows =
        workflowEnvironmentResult.rows as WorkflowEnvironmentAggregateRow[];

      return {
        tenantId,
        range: {
          key,
          start: start.toISOString(),
          end: end.toISOString(),
        },
        totals: totalsRows.map((row) => ({
          kind: row.kind,
          unit: row.unit,
          total: Number(row.total_quantity),
        })),
        breakdown: {
          byWorkflow: this.groupByWorkflow(workflowRows),
          byEnvironment: this.groupByEnvironment(environmentRows),
          byWorkflowEnvironment: this.groupByCompositeKey(
            workflowEnvironmentRows,
          ),
        },
      };
    } catch (error: any) {
      logger.error('Failed to fetch tenant usage summary', {
        error,
        tenantId,
      });
      throw error;
    }
  }

  private groupByWorkflow(rows: WorkflowAggregateRow[]): WorkflowBreakdown[] {
    const grouped = new Map<string, UsageTotal[]>();

    rows.forEach((row) => {
      const groupKey = row.workflow;
      const totals = grouped.get(groupKey) || [];
      totals.push({
        kind: row.kind,
        unit: row.unit,
        total: Number(row.total_quantity),
      });
      grouped.set(groupKey, totals);
    });

    return Array.from(grouped.entries()).map(([groupKey, totals]) => ({
      workflow: groupKey,
      totals,
    }));
  }

  private groupByEnvironment(
    rows: EnvironmentAggregateRow[],
  ): EnvironmentBreakdown[] {
    const grouped = new Map<string, UsageTotal[]>();

    rows.forEach((row) => {
      const groupKey = row.environment;
      const totals = grouped.get(groupKey) || [];
      totals.push({
        kind: row.kind,
        unit: row.unit,
        total: Number(row.total_quantity),
      });
      grouped.set(groupKey, totals);
    });

    return Array.from(grouped.entries()).map(([groupKey, totals]) => ({
      environment: groupKey,
      totals,
    }));
  }

  private groupByCompositeKey(
    rows: WorkflowEnvironmentAggregateRow[],
  ): WorkflowEnvironmentBreakdown[] {
    const grouped = new Map<string, WorkflowEnvironmentBreakdown>();

    rows.forEach((row) => {
      const composite = `${row.workflow}::${row.environment}`;
      const existing = grouped.get(composite) || {
        workflow: row.workflow,
        environment: row.environment,
        totals: [],
      };

      existing.totals.push({
        kind: row.kind,
        unit: row.unit,
        total: Number(row.total_quantity),
      });

      grouped.set(composite, existing);
    });

    return Array.from(grouped.values());
  }
}

export const tenantUsageService = new TenantUsageService();
