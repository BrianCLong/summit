import { getPostgresPool } from '../config/database.js';

export type AuditLogExportFormat = 'CSV' | 'JSON';

export interface AuditLogExportFilter {
  from?: string;
  to?: string;
  actions?: string[];
  userIds?: string[];
  resourceTypes?: string[];
}

export interface AuditLogPaginationInput {
  limit?: number;
  cursor?: string;
}

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogFetchResult {
  records: AuditLogRecord[];
  hasNextPage: boolean;
  nextCursor: string | null;
  totalCount: number;
  limit: number;
}

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

const CURSOR_SEPARATOR = '::';

function normalizeDateInput(value: string, field: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field} date`);
  }
  return date.toISOString();
}

export function encodeCursor(record: Pick<AuditLogRecord, 'createdAt' | 'id'>): string {
  return Buffer.from(`${record.createdAt}${CURSOR_SEPARATOR}${record.id}`, 'utf8').toString('base64');
}

export function decodeCursor(cursor: string): { createdAt: string; id: string } {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const [createdAt, id] = decoded.split(CURSOR_SEPARATOR);
    if (!createdAt || !id) {
      throw new Error('Invalid cursor payload');
    }
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid cursor timestamp');
    }
    return { createdAt: parsed.toISOString(), id };
  } catch (error) {
    throw new Error('Invalid pagination cursor');
  }
}

function sanitizeFilters(filter: AuditLogExportFilter | undefined): Required<AuditLogExportFilter> {
  const safeFilter: Required<AuditLogExportFilter> = {
    from: undefined,
    to: undefined,
    actions: [],
    userIds: [],
    resourceTypes: [],
  } as Required<AuditLogExportFilter>;

  if (!filter) {
    return safeFilter;
  }

  if (filter.from) {
    safeFilter.from = normalizeDateInput(filter.from, 'from');
  }
  if (filter.to) {
    safeFilter.to = normalizeDateInput(filter.to, 'to');
  }
  if (Array.isArray(filter.actions)) {
    safeFilter.actions = filter.actions.filter((action) => Boolean(action && action.trim()));
  }
  if (Array.isArray(filter.userIds)) {
    safeFilter.userIds = filter.userIds.filter(Boolean);
  }
  if (Array.isArray(filter.resourceTypes)) {
    safeFilter.resourceTypes = filter.resourceTypes.filter((type) => Boolean(type && type.trim()));
  }
  return safeFilter;
}

function mapRowToRecord(row: any): AuditLogRecord {
  const createdAt = row.createdAt ?? row.created_at;
  const createdDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return {
    id: row.id,
    userId: row.userId ?? row.user_id ?? null,
    action: row.action,
    resourceType: row.resourceType ?? row.resource_type,
    resourceId: row.resourceId ?? row.resource_id ?? null,
    details: row.details ?? null,
    ipAddress: row.ipAddress ?? row.ip_address ?? null,
    userAgent: row.userAgent ?? row.user_agent ?? null,
    createdAt: Number.isNaN(createdDate.getTime()) ? new Date().toISOString() : createdDate.toISOString(),
  };
}

export async function fetchAuditLogs(
  filter?: AuditLogExportFilter,
  pagination?: AuditLogPaginationInput,
): Promise<AuditLogFetchResult> {
  const pool = getPostgresPool();
  const safeFilter = sanitizeFilters(filter);
  const limit = Math.min(Math.max(pagination?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursor = pagination?.cursor;

  const conditions: string[] = [];
  const params: any[] = [];

  if (safeFilter.from) {
    params.push(safeFilter.from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (safeFilter.to) {
    params.push(safeFilter.to);
    conditions.push(`created_at <= $${params.length}`);
  }
  if (safeFilter.actions.length) {
    params.push(safeFilter.actions);
    conditions.push(`action = ANY($${params.length})`);
  }
  if (safeFilter.userIds.length) {
    params.push(safeFilter.userIds);
    conditions.push(`user_id = ANY($${params.length})`);
  }
  if (safeFilter.resourceTypes.length) {
    params.push(safeFilter.resourceTypes);
    conditions.push(`resource_type = ANY($${params.length})`);
  }

  if (cursor) {
    const { createdAt, id } = decodeCursor(cursor);
    params.push(createdAt);
    const createdAtIndex = params.length;
    params.push(id);
    const idIndex = params.length;
    conditions.push(
      `(created_at < $${createdAtIndex} OR (created_at = $${createdAtIndex} AND id < $${idIndex}))`,
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*)::bigint AS count FROM audit_logs ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const totalCount = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);

  const limitParamIndex = params.length + 1;
  const dataQuery = `
    SELECT
      id,
      user_id AS "userId",
      action,
      resource_type AS "resourceType",
      resource_id AS "resourceId",
      details,
      ip_address AS "ipAddress",
      user_agent AS "userAgent",
      created_at AS "createdAt"
    FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT $${limitParamIndex}
  `;

  const queryParams = [...params, limit + 1];
  const { rows } = await pool.query(dataQuery, queryParams);
  const hasNextPage = rows.length > limit;
  const limitedRows = hasNextPage ? rows.slice(0, limit) : rows;
  const records = limitedRows.map(mapRowToRecord);
  const nextCursor = hasNextPage && records.length ? encodeCursor(records[records.length - 1]) : null;

  return {
    records,
    hasNextPage,
    nextCursor,
    totalCount,
    limit,
  };
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const normalized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function serializeAuditLogs(records: AuditLogRecord[], format: AuditLogExportFormat): string {
  if (format === 'JSON') {
    return JSON.stringify(records);
  }
  if (format === 'CSV') {
    const header = ['id', 'userId', 'action', 'resourceType', 'resourceId', 'ipAddress', 'userAgent', 'createdAt', 'details'];
    const lines = [header.join(',')];
    for (const record of records) {
      const row = [
        escapeCsvValue(record.id),
        escapeCsvValue(record.userId),
        escapeCsvValue(record.action),
        escapeCsvValue(record.resourceType),
        escapeCsvValue(record.resourceId),
        escapeCsvValue(record.ipAddress),
        escapeCsvValue(record.userAgent),
        escapeCsvValue(record.createdAt),
        escapeCsvValue(record.details),
      ];
      lines.push(row.join(','));
    }
    return lines.join('\n');
  }
  throw new Error(`Unsupported export format: ${format}`);
}
