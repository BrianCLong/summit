"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__private__ = exports.TimescaleConnector = void 0;
const pg_1 = require("pg");
const VALID_IDENTIFIER = /^[a-zA-Z0-9_]+$/;
function quoteIdentifier(identifier) {
    if (!VALID_IDENTIFIER.test(identifier)) {
        throw new Error(`Unsafe identifier: ${identifier}`);
    }
    return `"${identifier}"`;
}
function buildTagFilters(tags, startingIndex) {
    const filters = [];
    const values = [];
    let idx = startingIndex;
    if (!tags) {
        return { filters, values, nextIndex: idx };
    }
    Object.entries(tags).forEach(([key, value]) => {
        filters.push(`tags ->> $${idx} = $${idx + 1}`);
        values.push(key, value);
        idx += 2;
    });
    return { filters, values, nextIndex: idx };
}
function aggregationFunction(fn) {
    switch (fn) {
        case 'avg':
            return 'avg';
        case 'sum':
            return 'sum';
        case 'min':
            return 'min';
        case 'max':
            return 'max';
        case 'median':
            return 'percentile_cont(0.5) WITHIN GROUP (ORDER BY value)';
        case 'p95':
            return 'percentile_cont(0.95) WITHIN GROUP (ORDER BY value)';
        case 'p99':
            return 'percentile_cont(0.99) WITHIN GROUP (ORDER BY value)';
        default:
            return 'avg';
    }
}
class TimescaleConnector {
    pool;
    table;
    constructor(config) {
        this.pool = config.pool ?? new pg_1.Pool({ connectionString: config.connectionString });
        const schema = quoteIdentifier(config.schema ?? 'public');
        const table = quoteIdentifier(config.table ?? 'time_series_points');
        this.table = `${schema}.${table}`;
    }
    async writePoints(points) {
        if (!points.length)
            return;
        const values = [];
        const placeholders = points
            .map((point, idx) => {
            const base = idx * 4;
            values.push(point.measurement, point.timestamp, point.tags ?? {}, point.fields);
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
        })
            .join(',');
        const sql = `INSERT INTO ${this.table} (measurement, ts, tags, fields) VALUES ${placeholders}`;
        await this.pool.query(sql, values);
    }
    async queryRange(params) {
        const values = [params.measurement, params.start, params.end];
        let idx = 4;
        const where = [`measurement = $1`, 'ts BETWEEN $2 AND $3'];
        const tagFilters = buildTagFilters(params.tags, idx);
        where.push(...tagFilters.filters);
        values.push(...tagFilters.values);
        idx = tagFilters.nextIndex;
        if (params.limit) {
            values.push(params.limit);
        }
        const sql = [
            `SELECT ts AS timestamp, fields, tags FROM ${this.table}`,
            `WHERE ${where.join(' AND ')}`,
            'ORDER BY ts ASC',
            params.limit ? `LIMIT $${values.length}` : '',
        ]
            .filter(Boolean)
            .join(' ');
        const result = await this.pool.query(sql, values);
        return result.rows.map((row) => ({
            timestamp: new Date(row.timestamp),
            values: row.fields,
            tags: row.tags,
        }));
    }
    async aggregate(params) {
        const values = [params.window.every, params.measurement, params.start, params.end];
        let idx = 5;
        const where = ['ts BETWEEN $3 AND $4', 'measurement = $2'];
        const tagFilters = buildTagFilters(params.tags, idx);
        where.push(...tagFilters.filters);
        values.push(...tagFilters.values);
        idx = tagFilters.nextIndex;
        if (params.fields?.length) {
            values.push(params.fields);
            where.push(`key = ANY($${idx})`);
            idx += 1;
        }
        const fn = aggregationFunction(params.window.function);
        const sql = `
      WITH expanded AS (
        SELECT time_bucket($1, ts) AS bucket, jsonb_each_text(fields) as field, tags
        FROM ${this.table}
        WHERE ${where.join(' AND ')}
      ),
      computed AS (
        SELECT bucket, field.key AS key, ${fn}(field.value::double precision) AS value, tags
        FROM expanded
        GROUP BY bucket, key, tags
      )
      SELECT bucket AS timestamp, jsonb_object_agg(key, value) AS values, tags
      FROM computed
      GROUP BY bucket, tags
      ORDER BY bucket ASC;
    `;
        const result = await this.pool.query(sql, values);
        return result.rows.map((row) => ({
            timestamp: new Date(row.timestamp),
            values: row.values,
            tags: row.tags,
        }));
    }
}
exports.TimescaleConnector = TimescaleConnector;
exports.__private__ = {
    buildTagFilters,
    quoteIdentifier,
};
