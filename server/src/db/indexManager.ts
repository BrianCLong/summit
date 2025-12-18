import { neo } from '../db/neo4j.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface IndexConfig {
    label: string;
    property: string;
    type: 'CONSTRAINT' | 'INDEX' | 'UNIQUENESS' | 'BTREE';
}

interface OptimizerConfig {
    indexes: IndexConfig[];
}

const CONFIG_PATH = path.resolve(__dirname, '../../config/neo4j-optimization.yml');

const SLOW_QUERY_PATTERN_THRESHOLD_MS = 100;

async function loadIndexConfig(): Promise<IndexConfig[]> {
    try {
        const fileContents = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = yaml.load(fileContents) as OptimizerConfig;
        return config.indexes || [];
    } catch (error) {
        logger.warn('Failed to load neo4j-optimization.yml, falling back to defaults', error);
        return [
          { label: 'Entity', property: 'id', type: 'CONSTRAINT' },
          { label: 'Entity', property: 'uuid', type: 'CONSTRAINT' },
          { label: 'Entity', property: 'type', type: 'INDEX' },
          { label: 'Investigation', property: 'status', type: 'INDEX' },
          { label: 'User', property: 'email', type: 'CONSTRAINT' }
        ];
    }
}

export async function checkNeo4jIndexes() {
  logger.info('Starting Neo4j Index Check...');
  const REQUIRED_INDEXES = await loadIndexConfig();

  try {
    const result = await neo.run('SHOW INDEXES');
    const existingIndexes = result.records.map((r: any) => {
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

        const exists = existingIndexes.some((idx: any) =>
            idx.labelsOrTypes && idx.labelsOrTypes.includes(req.label) &&
            idx.properties && idx.properties.includes(req.property) &&
            (isUniqueReq ? (idx.type === 'RANGE' || idx.type === 'UNIQUENESS') : true)
        );

        if (!exists) {
            missingIndexes.push(req);
        }
    }

    if (missingIndexes.length > 0) {
        logger.warn({ missingIndexes }, 'Missing Neo4j Indexes detected');
        for (const idx of missingIndexes) {
            const isUnique = idx.type === 'CONSTRAINT' || idx.type === 'UNIQUENESS';
            const query = isUnique
                ? `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${idx.label}) REQUIRE n.${idx.property} IS UNIQUE`
                : `CREATE INDEX IF NOT EXISTS FOR (n:${idx.label}) ON (n.${idx.property})`;

            logger.info({ query }, 'Creating missing index/constraint...');
            try {
                await neo.run(query);
            } catch (e) {
                logger.error({ error: e, query }, 'Failed to create index');
            }
        }
    } else {
        logger.info('All required Neo4j indexes are present.');
    }

  } catch (error) {
    logger.error('Failed to check Neo4j indexes', error);
  }
}

export async function analyzeQueries() {
    // This function would ideally parse a query log or rely on APOC
    // CALL apoc.monitor.kernel() or similar
    // Since we are limited without APOC, we will just log a placeholder.
    logger.info('Query analysis module initialized. Monitor logs for "Slow PostgreSQL query detected" (from postgres.ts) and general Neo4j latency metrics.');
}
