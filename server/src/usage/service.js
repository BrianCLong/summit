"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresUsageMeteringService = void 0;
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = require("../utils/logger.js");
class PostgresUsageMeteringService {
    pool = (0, postgres_js_1.getPostgresPool)();
    logger = logger_js_1.logger.child({ module: 'usage-metering' });
    tableReady = null;
    insertColumns = [
        'id',
        'tenant_id',
        'principal_id',
        'dimension',
        'quantity',
        'unit',
        'source',
        'metadata',
        'occurred_at',
        'recorded_at',
    ];
    async record(event) {
        await this.ensureTable();
        try {
            await this.pool.write(this.insertSql, this.toParams(event));
            this.logger.debug({ eventId: event.id, tenantId: event.tenantId }, 'Usage event recorded');
        }
        catch (error) {
            this.logger.error({ err: error, eventId: event.id, tenantId: event.tenantId }, 'Failed to record usage event');
            throw error;
        }
    }
    async recordBatch(events) {
        if (events.length === 0) {
            return;
        }
        await this.ensureTable();
        const params = [];
        const valueGroups = events.map((event, index) => {
            const eventParams = this.toParams(event);
            params.push(...eventParams);
            const offset = index * this.insertColumns.length;
            const placeholders = eventParams.map((_, paramIndex) => `$${offset + paramIndex + 1}`);
            return `(${placeholders.join(', ')})`;
        });
        const query = `${this.insertPrefix} VALUES ${valueGroups.join(', ')} ON CONFLICT (id) DO NOTHING`;
        try {
            await this.pool.withTransaction(async (client) => {
                await client.query(query, params);
            });
            this.logger.debug({ count: events.length }, 'Usage events batch recorded');
        }
        catch (error) {
            this.logger.error({ err: error, count: events.length }, 'Failed to record usage events batch');
            throw error;
        }
    }
    async ensureTable() {
        if (!this.tableReady) {
            this.tableReady = (async () => {
                try {
                    await this.pool.write(`
              CREATE TABLE IF NOT EXISTS usage_events (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                principal_id TEXT,
                dimension TEXT NOT NULL,
                quantity DOUBLE PRECISION NOT NULL,
                unit TEXT NOT NULL,
                source TEXT NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                occurred_at TIMESTAMPTZ NOT NULL,
                recorded_at TIMESTAMPTZ NOT NULL
              );
              CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_dimension
                ON usage_events (tenant_id, dimension, occurred_at);
            `);
                }
                catch (error) {
                    this.logger.error({ err: error }, 'Failed to ensure usage_events table exists');
                    this.tableReady = null;
                    throw error;
                }
            })();
        }
        return this.tableReady;
    }
    get insertPrefix() {
        return `INSERT INTO usage_events (${this.insertColumns.join(', ')})`;
    }
    get insertSql() {
        const placeholders = this.insertColumns
            .map((_, index) => `$${index + 1}`)
            .join(', ');
        return `${this.insertPrefix} VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
    }
    toParams(event) {
        return [
            event.id,
            event.tenantId,
            event.principalId ?? null,
            event.dimension,
            event.quantity,
            event.unit,
            event.source,
            JSON.stringify(event.metadata ?? {}),
            new Date(event.occurredAt),
            new Date(event.recordedAt),
        ];
    }
}
exports.PostgresUsageMeteringService = PostgresUsageMeteringService;
