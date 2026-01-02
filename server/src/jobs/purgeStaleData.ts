// @ts-nocheck
import { ClientBase, QueryConfig } from 'pg';

export interface DatabaseClient extends ClientBase {}

export type PurgeAction = 'delete' | 'anonymize';

export interface PurgeTarget {
  name: string;
  table: string;
  idColumn: string;
  timestampColumn?: string;
  expiresColumn?: string;
  retentionDays?: number;
  predicate?: string;
  action: PurgeAction;
  anonymize?: Record<string, unknown>;
  maxBatchSize?: number;
}

export interface PurgeOptions {
  dryRun?: boolean;
  maxBatchSize?: number;
  now?: Date;
}

export interface PurgeResult {
  name: string;
  action: PurgeAction;
  dryRun: boolean;
  matched: number;
  deleted?: number;
  anonymized?: number;
  notes?: string;
}

const DEFAULT_BATCH_SIZE = 500;
const MS_PER_DAY = 86_400_000;

function assertHasConditions(target: PurgeTarget) {
  if (!target.expiresColumn && !target.retentionDays) {
    throw new Error(
      `Refusing to purge ${target.table} because no expiry or retention window was provided`,
    );
  }
}

export function buildCandidateQuery(
  target: PurgeTarget,
  now: Date,
  limit: number,
): QueryConfig {
  assertHasConditions(target);

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (target.expiresColumn) {
    conditions.push(
      `${target.expiresColumn} IS NOT NULL AND ${target.expiresColumn} <= $${values.length + 1}`,
    );
    values.push(now);
  }

  if (target.retentionDays && target.timestampColumn) {
    const cutoff = new Date(now.getTime() - target.retentionDays * MS_PER_DAY);
    conditions.push(`${target.timestampColumn} <= $${values.length + 1}`);
    values.push(cutoff);
  }

  if (target.predicate) {
    conditions.push(`(${target.predicate})`);
  }

  if (!conditions.length) {
    throw new Error(`No WHERE clause generated for ${target.table}; refusing to run`);
  }

  values.push(limit);
  const whereClause = conditions.join(' AND ');

  return {
    text: `SELECT ${target.idColumn} FROM ${target.table} WHERE ${whereClause} ORDER BY ${
      target.timestampColumn ?? target.idColumn
    } ASC LIMIT $${values.length}`,
    values,
  };
}

export async function fetchCandidateIds(
  client: DatabaseClient,
  target: PurgeTarget,
  now: Date,
  limit: number,
): Promise<unknown[]> {
  const query = buildCandidateQuery(target, now, limit);
  const { rows } = await client.query(query);
  return rows.map((row: any) => row[target.idColumn]);
}

async function deleteByIds(
  client: DatabaseClient,
  target: PurgeTarget,
  ids: unknown[],
): Promise<number> {
  if (!ids.length) return 0;
  const query: QueryConfig = {
    text: `DELETE FROM ${target.table} WHERE ${target.idColumn} = ANY($1)`,
    values: [ids],
  };
  const result = await client.query(query);
  return result.rowCount ?? ids.length;
}

async function anonymizeByIds(
  client: DatabaseClient,
  target: PurgeTarget,
  ids: unknown[],
): Promise<number> {
  if (!ids.length) return 0;
  const anonymize = target.anonymize ?? {};
  const entries = Object.entries(anonymize);
  if (!entries.length) {
    throw new Error(`Anonymize action requested for ${target.name} without fields to update`);
  }

  const setClauses = entries.map(([col], idx) => `${col} = $${idx + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(ids);

  const query: QueryConfig = {
    text: `UPDATE ${target.table} SET ${setClauses.join(', ')} WHERE ${target.idColumn} = ANY($${
      values.length
    })`,
    values,
  };

  const result = await client.query(query);
  return result.rowCount ?? ids.length;
}

export async function purgeTarget(
  client: DatabaseClient,
  target: PurgeTarget,
  options: PurgeOptions = {},
): Promise<PurgeResult> {
  const now = options.now ?? new Date();
  const batchLimit = Math.min(
    target.maxBatchSize ?? DEFAULT_BATCH_SIZE,
    options.maxBatchSize ?? DEFAULT_BATCH_SIZE,
  );

  const ids = await fetchCandidateIds(client, target, now, batchLimit);

  if (!ids.length) {
    return {
      name: target.name,
      action: target.action,
      dryRun: options.dryRun ?? true,
      matched: 0,
      notes: 'No records matched retention criteria',
    };
  }

  if (options.dryRun ?? true) {
    return {
      name: target.name,
      action: target.action,
      dryRun: true,
      matched: ids.length,
      notes: `Dry-run only; would target ids: ${ids.slice(0, 5).join(', ')}${
        ids.length > 5 ? '...' : ''
      }`,
    };
  }

  if (target.action === 'delete') {
    const deleted = await deleteByIds(client, target, ids);
    return {
      name: target.name,
      action: target.action,
      dryRun: false,
      matched: ids.length,
      deleted,
    };
  }

  const anonymized = await anonymizeByIds(client, target, ids);
  return {
    name: target.name,
    action: target.action,
    dryRun: false,
    matched: ids.length,
    anonymized,
  };
}

export const defaultPurgeTargets: PurgeTarget[] = [
  {
    name: 'audit-logs',
    table: 'audit_logs',
    idColumn: 'id',
    timestampColumn: 'timestamp',
    expiresColumn: 'retention_expires_at',
    retentionDays: 180,
    predicate: "status IN ('success', 'failure', 'error')",
    action: 'delete',
    maxBatchSize: 500,
  },
  {
    name: 'copilot-events',
    table: 'copilot_events',
    idColumn: 'id',
    timestampColumn: 'created_at',
    expiresColumn: 'expires_at',
    retentionDays: 30,
    action: 'delete',
    maxBatchSize: 1000,
  },
  {
    name: 'copilot-runs-metadata',
    table: 'copilot_runs',
    idColumn: 'id',
    timestampColumn: 'finished_at',
    retentionDays: 180,
    predicate: "status IN ('succeeded', 'failed', 'paused')",
    action: 'anonymize',
    anonymize: {
      goal_text: '[anonymized after retention]',
      plan: {},
      metadata: {},
    },
    maxBatchSize: 200,
  },
];
