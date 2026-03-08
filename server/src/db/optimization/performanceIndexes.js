"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePerformanceIndexes = ensurePerformanceIndexes;
const pino_1 = __importDefault(require("pino"));
const postgres_js_1 = require("../postgres.js");
const neo4j_js_1 = require("../neo4j.js");
const logger = pino_1.default({ name: 'performance-indexes' });
async function postgresTableExists(tableName) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists`, [tableName]);
    return result.rows[0]?.exists ?? false;
}
async function ensurePostgresIndex(name, createStatement) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const existing = await pool.query('SELECT to_regclass($1) as oid', [
        name,
    ]);
    if (existing.rows[0]?.oid) {
        return;
    }
    await pool.query(createStatement);
    logger.info({ index: name }, 'Created PostgreSQL performance index');
}
async function ensurePostgresIndexes() {
    if (!(await postgresTableExists('entities'))) {
        logger.debug('Skipping PostgreSQL index creation because entities table is missing');
        return;
    }
    await ensurePostgresIndex('idx_entities_tenant_kind_created_at', 'CREATE INDEX IF NOT EXISTS idx_entities_tenant_kind_created_at ON entities (tenant_id, kind, created_at DESC)');
    await ensurePostgresIndex('idx_entities_labels_gin', 'CREATE INDEX IF NOT EXISTS idx_entities_labels_gin ON entities USING gin(labels)');
    if (await postgresTableExists('relationships')) {
        await ensurePostgresIndex('idx_relationships_tenant_source_target', 'CREATE INDEX IF NOT EXISTS idx_relationships_tenant_source_target ON relationships (tenant_id, source_id, target_id)');
    }
}
async function ensureNeo4jIndexes() {
    const driver = (0, neo4j_js_1.getNeo4jDriver)();
    const session = driver.session();
    try {
        await session.run('CREATE FULLTEXT INDEX evidenceContentSearch IF NOT EXISTS FOR (n:Evidence) ON EACH [n.content]');
        await session.run('CREATE INDEX evidence_tenant_label IF NOT EXISTS FOR (n:Evidence) ON (n.tenantId)');
    }
    finally {
        await session.close();
    }
}
async function ensurePerformanceIndexes() {
    try {
        await ensurePostgresIndexes();
    }
    catch (error) {
        logger.warn({ err: error }, 'PostgreSQL index bootstrap failed');
    }
    try {
        await ensureNeo4jIndexes();
    }
    catch (error) {
        logger.warn({ err: error }, 'Neo4j index bootstrap failed');
    }
}
