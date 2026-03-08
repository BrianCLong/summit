"use strict";
/**
 * PostgreSQL Metadata Extractor
 * Extracts schema and metadata from PostgreSQL databases
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresExtractor = void 0;
const pg_1 = require("pg");
class PostgresExtractor {
    pool;
    constructor(connectionString) {
        this.pool = new pg_1.Pool({ connectionString });
    }
    /**
     * Extract metadata from PostgreSQL database
     */
    async extract() {
        const startTime = Date.now();
        const client = await this.pool.connect();
        try {
            const assets = [];
            // Extract tables
            const tables = await this.extractTables(client);
            assets.push(...tables);
            // Extract views
            const views = await this.extractViews(client);
            assets.push(...views);
            // Extract relationships
            const relationships = await this.extractRelationships(client);
            const statistics = {
                totalAssets: assets.length,
                assetsWithSchema: assets.filter((a) => a.schema !== null).length,
                assetsWithSamples: assets.filter((a) => a.sampleData.length > 0).length,
                relationshipsInferred: relationships.length,
                processingTimeMs: Date.now() - startTime,
            };
            return {
                sourceId: 'postgres',
                assets,
                relationships,
                statistics,
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Extract table metadata
     */
    async extractTables(client) {
        const query = `
      SELECT
        t.table_schema,
        t.table_name,
        t.table_type,
        pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name)) as table_size,
        obj_description((quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))::regclass) as table_comment
      FROM information_schema.tables t
      WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_schema, t.table_name
    `;
        const result = await client.query(query);
        const assets = [];
        for (const row of result.rows) {
            const columns = await this.extractColumns(client, row.table_schema, row.table_name);
            const sampleData = await this.extractSampleData(client, row.table_schema, row.table_name);
            assets.push({
                name: `${row.table_schema}.${row.table_name}`,
                type: 'TABLE',
                schema: {
                    columns,
                    primaryKey: columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
                },
                properties: {
                    schema: row.table_schema,
                    tableName: row.table_name,
                    tableSize: row.table_size,
                    comment: row.table_comment,
                },
                statistics: {
                    rowCount: await this.getRowCount(client, row.table_schema, row.table_name),
                },
                sampleData,
            });
        }
        return assets;
    }
    /**
     * Extract column metadata
     */
    async extractColumns(client, schema, table) {
        const query = `
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        col_description((quote_ident(c.table_schema)||'.'||quote_ident(c.table_name))::regclass, c.ordinal_position) as column_comment,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_schema = pk.table_schema
        AND c.table_name = pk.table_name
        AND c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.table_schema = fk.table_schema
        AND c.table_name = fk.table_name
        AND c.column_name = fk.column_name
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `;
        const result = await client.query(query, [schema, table]);
        return result.rows.map((row) => ({
            name: row.column_name,
            dataType: row.data_type,
            nullable: row.is_nullable === 'YES',
            defaultValue: row.column_default,
            maxLength: row.character_maximum_length,
            precision: row.numeric_precision,
            scale: row.numeric_scale,
            comment: row.column_comment,
            isPrimaryKey: row.is_primary_key,
            isForeignKey: row.is_foreign_key,
        }));
    }
    /**
     * Extract sample data
     */
    async extractSampleData(client, schema, table, limit = 10) {
        try {
            const query = `SELECT * FROM ${client.escapeIdentifier(schema)}.${client.escapeIdentifier(table)} LIMIT $1`;
            const result = await client.query(query, [limit]);
            return result.rows;
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Get row count
     */
    async getRowCount(client, schema, table) {
        try {
            const query = `SELECT COUNT(*) as count FROM ${client.escapeIdentifier(schema)}.${client.escapeIdentifier(table)}`;
            const result = await client.query(query);
            return parseInt(result.rows[0].count, 10);
        }
        catch (error) {
            return 0;
        }
    }
    /**
     * Extract views
     */
    async extractViews(client) {
        const query = `
      SELECT
        table_schema,
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `;
        const result = await client.query(query);
        const assets = [];
        for (const row of result.rows) {
            const columns = await this.extractColumns(client, row.table_schema, row.table_name);
            assets.push({
                name: `${row.table_schema}.${row.table_name}`,
                type: 'VIEW',
                schema: {
                    columns,
                    definition: row.view_definition,
                },
                properties: {
                    schema: row.table_schema,
                    viewName: row.table_name,
                },
                statistics: {},
                sampleData: [],
            });
        }
        return assets;
    }
    /**
     * Extract foreign key relationships
     */
    async extractRelationships(client) {
        const query = `
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    `;
        const result = await client.query(query);
        return result.rows.map((row) => ({
            fromAsset: `${row.table_schema}.${row.table_name}`,
            toAsset: `${row.foreign_table_schema}.${row.foreign_table_name}`,
            type: 'FOREIGN_KEY',
            confidence: 1.0,
            metadata: {
                constraintName: row.constraint_name,
                fromColumn: row.column_name,
                toColumn: row.foreign_column_name,
            },
        }));
    }
    /**
     * Close connection pool
     */
    async close() {
        await this.pool.end();
    }
}
exports.PostgresExtractor = PostgresExtractor;
