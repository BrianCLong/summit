"use strict";
/**
 * Data loading engine with multiple load strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLoader = void 0;
const pg_1 = require("pg");
const types_1 = require("@intelgraph/data-integration/src/types");
class DataLoader {
    config;
    logger;
    pool = null;
    client = null;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    async connect() {
        // Using PostgreSQL as default target - would support multiple targets
        this.pool = new pg_1.Pool({
            // Connection config would come from environment or config
            connectionString: process.env.TARGET_DATABASE_URL
        });
        this.client = await this.pool.connect();
        this.logger.info('Connected to target database');
    }
    async disconnect() {
        if (this.client) {
            this.client.release();
            this.client = null;
        }
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        this.logger.info('Disconnected from target database');
    }
    /**
     * Load data to target using configured strategy
     */
    async load(data) {
        const result = {
            recordsLoaded: 0,
            recordsFailed: 0,
            errors: []
        };
        if (data.length === 0) {
            return result;
        }
        try {
            switch (this.config.strategy) {
                case types_1.LoadStrategy.BULK:
                    await this.bulkLoad(data, result);
                    break;
                case types_1.LoadStrategy.UPSERT:
                    await this.upsertLoad(data, result);
                    break;
                case types_1.LoadStrategy.SCD_TYPE2:
                    await this.scdType2Load(data, result);
                    break;
                case types_1.LoadStrategy.APPEND_ONLY:
                    await this.appendOnlyLoad(data, result);
                    break;
                case types_1.LoadStrategy.DELTA:
                    await this.deltaLoad(data, result);
                    break;
                default:
                    await this.bulkLoad(data, result);
            }
            return result;
        }
        catch (error) {
            this.logger.error('Error loading data', { error });
            result.errors.push({
                timestamp: new Date(),
                stage: 'loading',
                message: error instanceof Error ? error.message : 'Unknown error',
                details: error
            });
            return result;
        }
    }
    async bulkLoad(data, result) {
        if (!this.client) {
            throw new Error('Not connected to database');
        }
        const batchSize = this.config.batchSize || 1000;
        const tableName = this.getFullTableName();
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            try {
                await this.client.query('BEGIN');
                for (const record of batch) {
                    const { columns, values, placeholders } = this.prepareInsert(record);
                    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
                    await this.client.query(query, values);
                    result.recordsLoaded++;
                }
                await this.client.query('COMMIT');
            }
            catch (error) {
                await this.client.query('ROLLBACK');
                result.recordsFailed += batch.length;
                result.errors.push({
                    timestamp: new Date(),
                    stage: 'loading',
                    message: `Bulk load failed for batch starting at index ${i}`,
                    details: error
                });
            }
        }
    }
    async upsertLoad(data, result) {
        if (!this.client) {
            throw new Error('Not connected to database');
        }
        const tableName = this.getFullTableName();
        const upsertKeys = this.config.upsertKey || ['id'];
        for (const record of data) {
            try {
                const { columns, values, placeholders } = this.prepareInsert(record);
                const updateSet = columns
                    .split(',')
                    .map((col, idx) => `${col.trim()} = $${idx + 1}`)
                    .join(', ');
                const conflictColumns = upsertKeys.join(', ');
                const query = `
          INSERT INTO ${tableName} (${columns})
          VALUES (${placeholders})
          ON CONFLICT (${conflictColumns})
          DO UPDATE SET ${updateSet}
        `;
                await this.client.query(query, values);
                result.recordsLoaded++;
            }
            catch (error) {
                result.recordsFailed++;
                result.errors.push({
                    timestamp: new Date(),
                    stage: 'loading',
                    message: 'Upsert failed for record',
                    details: error
                });
            }
        }
    }
    async scdType2Load(data, result) {
        if (!this.client) {
            throw new Error('Not connected to database');
        }
        const tableName = this.getFullTableName();
        const naturalKeys = this.config.upsertKey || ['id'];
        const effectiveFrom = 'effective_from';
        const effectiveTo = 'effective_to';
        const isCurrent = 'is_current';
        for (const record of data) {
            try {
                await this.client.query('BEGIN');
                // Close current record
                const whereClause = naturalKeys
                    .map((key, idx) => `${key} = $${idx + 1}`)
                    .join(' AND ');
                const keyValues = naturalKeys.map(key => record[key]);
                await this.client.query(`UPDATE ${tableName}
           SET ${effectiveTo} = CURRENT_TIMESTAMP, ${isCurrent} = false
           WHERE ${whereClause} AND ${isCurrent} = true`, keyValues);
                // Insert new record
                const enrichedRecord = {
                    ...record,
                    [effectiveFrom]: new Date(),
                    [effectiveTo]: new Date('9999-12-31'),
                    [isCurrent]: true
                };
                const { columns, values, placeholders } = this.prepareInsert(enrichedRecord);
                const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
                await this.client.query(query, values);
                await this.client.query('COMMIT');
                result.recordsLoaded++;
            }
            catch (error) {
                await this.client.query('ROLLBACK');
                result.recordsFailed++;
                result.errors.push({
                    timestamp: new Date(),
                    stage: 'loading',
                    message: 'SCD Type 2 load failed for record',
                    details: error
                });
            }
        }
    }
    async appendOnlyLoad(data, result) {
        await this.bulkLoad(data, result);
    }
    async deltaLoad(data, result) {
        // Similar to upsert but only updates changed fields
        await this.upsertLoad(data, result);
    }
    prepareInsert(record) {
        const columns = [];
        const values = [];
        const paramIndex = 1;
        for (const [key, value] of Object.entries(record)) {
            columns.push(key);
            values.push(value);
        }
        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
        return {
            columns: columns.join(', '),
            values,
            placeholders
        };
    }
    getFullTableName() {
        const { targetSchema, targetTable } = this.config;
        return targetSchema ? `${targetSchema}.${targetTable}` : targetTable;
    }
}
exports.DataLoader = DataLoader;
