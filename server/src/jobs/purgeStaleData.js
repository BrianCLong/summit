"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPurgeTargets = void 0;
exports.buildCandidateQuery = buildCandidateQuery;
exports.fetchCandidateIds = fetchCandidateIds;
exports.purgeTarget = purgeTarget;
const DEFAULT_BATCH_SIZE = 500;
const MS_PER_DAY = 86_400_000;
function assertHasConditions(target) {
    if (!target.expiresColumn && !target.retentionDays) {
        throw new Error(`Refusing to purge ${target.table} because no expiry or retention window was provided`);
    }
}
function buildCandidateQuery(target, now, limit) {
    assertHasConditions(target);
    const conditions = [];
    const values = [];
    if (target.expiresColumn) {
        conditions.push(`${target.expiresColumn} IS NOT NULL AND ${target.expiresColumn} <= $${values.length + 1}`);
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
        text: `SELECT ${target.idColumn} FROM ${target.table} WHERE ${whereClause} ORDER BY ${target.timestampColumn ?? target.idColumn} ASC LIMIT $${values.length}`,
        values,
    };
}
async function fetchCandidateIds(client, target, now, limit) {
    const query = buildCandidateQuery(target, now, limit);
    const { rows } = await client.query(query);
    return rows.map((row) => row[target.idColumn]);
}
async function deleteByIds(client, target, ids) {
    if (!ids.length)
        return 0;
    const query = {
        text: `DELETE FROM ${target.table} WHERE ${target.idColumn} = ANY($1)`,
        values: [ids],
    };
    const result = await client.query(query);
    return result.rowCount ?? ids.length;
}
async function anonymizeByIds(client, target, ids) {
    if (!ids.length)
        return 0;
    const anonymize = target.anonymize ?? {};
    const entries = Object.entries(anonymize);
    if (!entries.length) {
        throw new Error(`Anonymize action requested for ${target.name} without fields to update`);
    }
    const setClauses = entries.map(([col], idx) => `${col} = $${idx + 1}`);
    const values = entries.map(([, value]) => value);
    values.push(ids);
    const query = {
        text: `UPDATE ${target.table} SET ${setClauses.join(', ')} WHERE ${target.idColumn} = ANY($${values.length})`,
        values,
    };
    const result = await client.query(query);
    return result.rowCount ?? ids.length;
}
async function purgeTarget(client, target, options = {}) {
    const now = options.now ?? new Date();
    const batchLimit = Math.min(target.maxBatchSize ?? DEFAULT_BATCH_SIZE, options.maxBatchSize ?? DEFAULT_BATCH_SIZE);
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
            notes: `Dry-run only; would target ids: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''}`,
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
exports.defaultPurgeTargets = [
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
