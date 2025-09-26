import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { getPostgresPool } from '../../db/postgres.js';
import logger from '../../config/logger.js';

const log = logger.child({ name: 'dashboard-repository' });

export interface DashboardWidgetRecord {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown> | null;
  dataSource: Record<string, unknown> | null;
  refreshInterval: number | null;
}

export interface DashboardConfigurationRecord {
  id: string;
  name: string;
  description: string | null;
  layout: string;
  settings: Record<string, unknown> | null;
  updatedAt: Date;
  widgets: DashboardWidgetRecord[];
}

export interface SaveDashboardWidget {
  id?: string | null;
  type: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config?: Record<string, unknown> | null;
  dataSource?: Record<string, unknown> | null;
  refreshInterval?: number | null;
}

export interface SaveDashboardConfiguration {
  id?: string | null;
  userId: string;
  name: string;
  description?: string | null;
  layout: string;
  settings?: Record<string, unknown> | null;
  widgets: SaveDashboardWidget[];
}

const pool = getPostgresPool();

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

async function mapDashboardRow(
  row: any,
  client: PoolClient | null,
): Promise<DashboardConfigurationRecord | null> {
  if (!row) return null;
  const executor = client ?? pool;
  const widgetResult = await executor.query(
    `SELECT id, type, title, config, data_source, position, refresh_interval
     FROM dashboard_widgets
     WHERE dashboard_id = $1
     ORDER BY (position->>'y')::int ASC, (position->>'x')::int ASC`,
    [row.id],
  );

  const widgets: DashboardWidgetRecord[] = widgetResult.rows.map((widget: any) => ({
    id: widget.id,
    type: widget.type,
    title: widget.title,
    position:
      typeof widget.position === 'string'
        ? JSON.parse(widget.position)
        : widget.position ?? { x: 0, y: 0, w: 4, h: 4 },
    config:
      typeof widget.config === 'string'
        ? (JSON.parse(widget.config) as Record<string, unknown>)
        : widget.config ?? null,
    dataSource:
      typeof widget.data_source === 'string'
        ? (JSON.parse(widget.data_source) as Record<string, unknown>)
        : widget.data_source ?? null,
    refreshInterval: widget.refresh_interval ?? null,
  }));

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    layout: row.layout,
    settings:
      typeof row.settings === 'string'
        ? (JSON.parse(row.settings) as Record<string, unknown>)
        : row.settings ?? null,
    updatedAt: row.updated_at,
    widgets,
  };
}

export async function fetchDashboardConfiguration(
  options: { id?: string | null; userId: string },
): Promise<DashboardConfigurationRecord | null> {
  const { id, userId } = options;
  if (id && !isUuid(id)) {
    log.warn({ id }, 'Ignoring non-uuid dashboard id');
  }

  if (id && isUuid(id)) {
    const result = await pool.query(
      `SELECT id, name, description, layout, settings, updated_at
       FROM dashboards
       WHERE id = $1 AND (created_by = $2 OR is_public IS TRUE)
       LIMIT 1`,
      [id, userId],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return await mapDashboardRow(result.rows[0], null);
  }

  const latest = await pool.query(
    `SELECT id, name, description, layout, settings, updated_at
     FROM dashboards
     WHERE created_by = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId],
  );

  if (latest.rowCount === 0) {
    return null;
  }

  return await mapDashboardRow(latest.rows[0], null);
}

export async function saveDashboardConfiguration(
  input: SaveDashboardConfiguration,
): Promise<DashboardConfigurationRecord> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const normalizedSettings = input.settings ?? {};
    const normalizedDescription = input.description ?? null;
    const layout = input.layout || 'grid';

    let dashboardId: string;

    if (input.id && isUuid(input.id)) {
      const updateResult = await client.query(
        `UPDATE dashboards
         SET name = $1,
             description = $2,
             layout = $3,
             settings = $4,
             updated_at = NOW()
         WHERE id = $5 AND created_by = $6
         RETURNING id, name, description, layout, settings, updated_at`,
        [
          input.name,
          normalizedDescription,
          layout,
          JSON.stringify(normalizedSettings),
          input.id,
          input.userId,
        ],
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Dashboard not found or access denied');
      }
      dashboardId = updateResult.rows[0].id;
    } else {
      const insertResult = await client.query(
        `INSERT INTO dashboards (name, description, layout, settings, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [input.name, normalizedDescription, layout, JSON.stringify(normalizedSettings), input.userId],
      );
      dashboardId = insertResult.rows[0].id;
    }

    await client.query('DELETE FROM dashboard_widgets WHERE dashboard_id = $1', [dashboardId]);

    for (const widget of input.widgets) {
      const widgetId = widget.id && isUuid(widget.id) ? widget.id : randomUUID();
      await client.query(
        `INSERT INTO dashboard_widgets
         (id, dashboard_id, type, title, config, data_source, position, refresh_interval, is_visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
        [
          widgetId,
          dashboardId,
          widget.type,
          widget.title,
          JSON.stringify(widget.config ?? {}),
          JSON.stringify(widget.dataSource ?? {}),
          JSON.stringify(widget.position),
          widget.refreshInterval ?? null,
        ],
      );
    }

    await client.query('COMMIT');
    const refreshed = await fetchDashboardConfiguration({ id: dashboardId, userId: input.userId });
    if (!refreshed) {
      throw new Error('Failed to load dashboard after save');
    }
    return refreshed;
  } catch (error) {
    await client.query('ROLLBACK');
    log.error({ err: error instanceof Error ? error.message : error }, 'Failed to save dashboard configuration');
    throw error;
  } finally {
    client.release();
  }
}
