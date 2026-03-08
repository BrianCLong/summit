"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkNeo4jIndexes = checkNeo4jIndexes;
exports.analyzeQueries = analyzeQueries;
// @ts-nocheck
const neo4j_js_1 = require("../db/neo4j.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const CONFIG_PATH = path_1.default.resolve(__dirname, '../../config/neo4j-optimization.yml');
const SLOW_QUERY_PATTERN_THRESHOLD_MS = 100;
async function loadIndexConfig() {
    try {
        const fileContents = await promises_1.default.readFile(CONFIG_PATH, 'utf8');
        const config = js_yaml_1.default.load(fileContents);
        return config.indexes || [];
    }
    catch (error) {
        logger_js_1.default.warn('Failed to load neo4j-optimization.yml, falling back to defaults', error);
        return [
            { label: 'Entity', property: 'id', type: 'CONSTRAINT' },
            { label: 'Entity', property: 'uuid', type: 'CONSTRAINT' },
            { label: 'Entity', property: 'type', type: 'INDEX' },
            { label: 'Investigation', property: 'status', type: 'INDEX' },
            { label: 'User', property: 'email', type: 'CONSTRAINT' }
        ];
    }
}
async function checkNeo4jIndexes() {
    logger_js_1.default.info('Starting Neo4j Index Check...');
    const REQUIRED_INDEXES = await loadIndexConfig();
    try {
        const result = await neo4j_js_1.neo.run('SHOW INDEXES');
        const existingIndexes = result.records.map((r) => {
            const obj = r.toObject();
            return {
                name: obj.name,
                labelsOrTypes: obj.labelsOrTypes,
                properties: obj.properties,
                type: obj.type
            };
        });
        const missingIndexes = [];
        for (const req of REQUIRED_INDEXES) {
            // Map config types to Neo4j types for comparison
            // Config: CONSTRAINT (unique), INDEX (btree)
            // Neo4j: UNIQUENESS, RANGE, BTREE, LOOKUP, TEXT
            const isUniqueReq = req.type === 'CONSTRAINT' || req.type === 'UNIQUENESS';
            const exists = existingIndexes.some((idx) => idx.labelsOrTypes && idx.labelsOrTypes.includes(req.label) &&
                idx.properties && idx.properties.includes(req.property) &&
                (isUniqueReq ? (idx.type === 'RANGE' || idx.type === 'UNIQUENESS') : true));
            if (!exists) {
                missingIndexes.push(req);
            }
        }
        if (missingIndexes.length > 0) {
            logger_js_1.default.warn({ missingIndexes }, 'Missing Neo4j Indexes detected');
            for (const idx of missingIndexes) {
                const isUnique = idx.type === 'CONSTRAINT' || idx.type === 'UNIQUENESS';
                const query = isUnique
                    ? `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${idx.label}) REQUIRE n.${idx.property} IS UNIQUE`
                    : `CREATE INDEX IF NOT EXISTS FOR (n:${idx.label}) ON (n.${idx.property})`;
                logger_js_1.default.info({ query }, 'Creating missing index/constraint...');
                try {
                    await neo4j_js_1.neo.run(query);
                }
                catch (e) {
                    logger_js_1.default.error({ error: e, query }, 'Failed to create index');
                }
            }
        }
        else {
            logger_js_1.default.info('All required Neo4j indexes are present.');
        }
    }
    catch (error) {
        logger_js_1.default.error('Failed to check Neo4j indexes', error);
    }
}
async function analyzeQueries() {
    // This function would ideally parse a query log or rely on APOC
    // CALL apoc.monitor.kernel() or similar
    // Since we are limited without APOC, we will just log a placeholder.
    logger_js_1.default.info('Query analysis module initialized. Monitor logs for "Slow PostgreSQL query detected" (from postgres.ts) and general Neo4j latency metrics.');
}
