"use strict";
/**
 * Feed Processor Service
 * Data ingestion worker with OpenLineage integration and license enforcement
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bull_1 = __importDefault(require("bull"));
const ioredis_1 = __importDefault(require("ioredis"));
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const pg_1 = require("pg");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const NODE_ENV = process.env.NODE_ENV || 'development';
const jsonRecord = () => zod_1.z.record(zod_1.z.string(), zod_1.z.any());
// Logger
const logger = (0, pino_1.default)({
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty' } }
        : {}),
});
// Connections
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
const neo4jDriver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'test'));
const pgPool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/postgres',
});
// Queues
const ingestionQueue = new bull_1.default('data-ingestion', process.env.REDIS_URL || 'redis://localhost:6379');
const transformQueue = new bull_1.default('data-transform', process.env.REDIS_URL || 'redis://localhost:6379');
// Schemas
const IngestionJobSchema = zod_1.z.object({
    job_id: zod_1.z.string(),
    source_type: zod_1.z.enum(['csv', 'json', 'elasticsearch', 'esri', 'api']),
    source_config: jsonRecord(),
    data_source_id: zod_1.z.string(),
    target_graph: zod_1.z.string().default('main'),
    transform_rules: zod_1.z.array(jsonRecord()).optional(),
    authority_id: zod_1.z.string(),
    reason_for_access: zod_1.z.string(),
});
const LineageEventSchema = zod_1.z.object({
    eventType: zod_1.z.enum(['START', 'COMPLETE', 'FAIL', 'ABORT']),
    eventTime: zod_1.z.string().datetime(),
    run: zod_1.z.object({
        runId: zod_1.z.string(),
        facets: jsonRecord().optional(),
    }),
    job: zod_1.z.object({
        namespace: zod_1.z.string(),
        name: zod_1.z.string(),
        facets: jsonRecord().optional(),
    }),
    inputs: zod_1.z
        .array(zod_1.z.object({
        namespace: zod_1.z.string(),
        name: zod_1.z.string(),
        facets: jsonRecord().optional(),
    }))
        .optional(),
    outputs: zod_1.z
        .array(zod_1.z.object({
        namespace: zod_1.z.string(),
        name: zod_1.z.string(),
        facets: jsonRecord().optional(),
    }))
        .optional(),
    producer: zod_1.z.string(),
});
// OpenLineage client
class OpenLineageClient {
    baseUrl;
    constructor(baseUrl = process.env.OPENLINEAGE_URL || 'http://localhost:5000') {
        this.baseUrl = baseUrl;
    }
    async emitEvent(event) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/lineage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            });
            if (!response.ok) {
                throw new Error(`OpenLineage emit failed: ${response.status}`);
            }
            logger.info({
                eventType: event.eventType,
                job: event.job.name,
                runId: event.run.runId,
            }, 'OpenLineage event emitted');
        }
        catch (error) {
            logger.error({ err: error }, 'Failed to emit OpenLineage event');
            // Don't fail the job if lineage emission fails
        }
    }
    createRunEvent(eventType, jobName, runId, inputs, outputs) {
        return {
            eventType,
            eventTime: new Date().toISOString(),
            run: {
                runId,
                facets: {},
            },
            job: {
                namespace: 'intelgraph',
                name: jobName,
                facets: {},
            },
            inputs: inputs?.map((input) => ({
                namespace: 'intelgraph',
                name: input.name,
                facets: {
                    schema: input.schema,
                    dataSource: {
                        name: input.source_name,
                        uri: input.source_uri,
                    },
                },
            })),
            outputs: outputs?.map((output) => ({
                namespace: 'intelgraph',
                name: output.name,
                facets: {
                    schema: output.schema,
                    dataQuality: output.quality_metrics,
                },
            })),
            producer: 'intelgraph-feed-processor',
        };
    }
}
const lineageClient = new OpenLineageClient();
// License enforcement client
class LicenseEnforcer {
    baseUrl;
    constructor(baseUrl = process.env.LICENSE_REGISTRY_URL ||
        'http://localhost:4030') {
        this.baseUrl = baseUrl;
    }
    async checkCompliance(operation, dataSourceIds, purpose, authorityId, reasonForAccess) {
        try {
            const response = await fetch(`${this.baseUrl}/compliance/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Authority-ID': authorityId,
                    'X-Reason-For-Access': reasonForAccess,
                },
                body: JSON.stringify({
                    operation,
                    data_source_ids: dataSourceIds,
                    purpose,
                }),
            });
            if (!response.ok) {
                logger.error({ status: response.status }, 'License check failed');
                return {
                    allowed: false,
                    reason: 'License validation service unavailable',
                };
            }
            const result = await response.json();
            return {
                allowed: result.compliance_status === 'allow',
                reason: result.human_readable_reason,
            };
        }
        catch (error) {
            logger.error({ err: error }, 'License enforcement error');
            return { allowed: false, reason: 'License validation failed' };
        }
    }
}
const licenseEnforcer = new LicenseEnforcer();
// Data connectors
const connectors = {
    csv: async (config) => {
        // Mock CSV connector
        logger.info(config, 'Processing CSV data');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return [
            { id: '1', name: 'Entity A', type: 'person', source: 'csv' },
            { id: '2', name: 'Entity B', type: 'organization', source: 'csv' },
        ];
    },
    elasticsearch: async (config) => {
        // Mock Elasticsearch connector
        logger.info(config, 'Querying Elasticsearch');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return [
            {
                id: '1',
                message: 'Security alert',
                severity: 'high',
                timestamp: new Date().toISOString(),
            },
            {
                id: '2',
                message: 'System error',
                severity: 'medium',
                timestamp: new Date().toISOString(),
            },
        ];
    },
    esri: async (config) => {
        // Mock ESRI ArcGIS connector
        logger.info(config, 'Fetching ESRI data');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return [
            {
                id: '1',
                location: { lat: 40.7128, lon: -74.006 },
                properties: { name: 'NYC' },
            },
            {
                id: '2',
                location: { lat: 34.0522, lon: -118.2437 },
                properties: { name: 'LA' },
            },
        ];
    },
    api: async (config) => {
        // Mock API connector
        logger.info(config, 'Calling external API');
        await new Promise((resolve) => setTimeout(resolve, 800));
        return [
            { id: '1', data: 'Sample API data', status: 'active' },
            { id: '2', data: 'More API data', status: 'inactive' },
        ];
    },
};
// Graph storage
class GraphStorage {
    async storeEntities(entities, jobId) {
        const session = neo4jDriver.session();
        try {
            await session.executeWrite(async (tx) => {
                for (const entity of entities) {
                    await tx.run(`MERGE (n:Entity {id: $id})
             SET n += $properties, n.ingestion_job = $jobId, n.updated_at = datetime()`, {
                        id: entity.id,
                        properties: entity,
                        jobId,
                    });
                }
            });
            logger.info({
                count: entities.length,
                jobId,
            }, 'Stored entities in graph');
        }
        finally {
            await session.close();
        }
    }
    async createRelationships(relationships, jobId) {
        const session = neo4jDriver.session();
        try {
            await session.executeWrite(async (tx) => {
                for (const rel of relationships) {
                    await tx.run(`MATCH (a:Entity {id: $sourceId}), (b:Entity {id: $targetId})
             MERGE (a)-[r:${rel.type}]->(b)
             SET r += $properties, r.ingestion_job = $jobId, r.created_at = datetime()`, {
                        sourceId: rel.source,
                        targetId: rel.target,
                        properties: rel.properties || {},
                        jobId,
                    });
                }
            });
            logger.info({
                count: relationships.length,
                jobId,
            }, 'Created relationships in graph');
        }
        finally {
            await session.close();
        }
    }
}
const graphStorage = new GraphStorage();
// Job processors
ingestionQueue.process('ingest-data', 5, async (job) => {
    const jobData = IngestionJobSchema.parse(job.data);
    const runId = (0, uuid_1.v4)();
    try {
        // Emit START event
        await lineageClient.emitEvent(lineageClient.createRunEvent('START', `ingest-${jobData.source_type}`, runId, [
            {
                name: jobData.data_source_id,
                source_name: jobData.source_type,
                source_uri: JSON.stringify(jobData.source_config),
                schema: { type: 'unknown' },
            },
        ]));
        // Check license compliance
        const compliance = await licenseEnforcer.checkCompliance('ingest', [jobData.data_source_id], 'data-ingestion', jobData.authority_id, jobData.reason_for_access);
        if (!compliance.allowed) {
            throw new Error(`License compliance violation: ${compliance.reason}`);
        }
        // Execute connector
        const connector = connectors[jobData.source_type];
        if (!connector) {
            throw new Error(`Unknown source type: ${jobData.source_type}`);
        }
        const rawData = await connector(jobData.source_config);
        // Transform data if rules provided
        const transformedData = rawData;
        if (jobData.transform_rules && jobData.transform_rules.length > 0) {
            // Add to transform queue
            await transformQueue.add('transform-data', {
                job_id: jobData.job_id,
                raw_data: rawData,
                transform_rules: jobData.transform_rules,
                run_id: runId,
            });
        }
        else {
            // Store directly
            await graphStorage.storeEntities(transformedData, jobData.job_id);
        }
        // Emit COMPLETE event
        await lineageClient.emitEvent(lineageClient.createRunEvent('COMPLETE', `ingest-${jobData.source_type}`, runId, [
            {
                name: jobData.data_source_id,
                source_name: jobData.source_type,
                source_uri: JSON.stringify(jobData.source_config),
                schema: { type: 'unknown' },
            },
        ], [
            {
                name: `${jobData.target_graph}-entities`,
                schema: { entities: transformedData.length },
                quality_metrics: {
                    completeness: 1.0,
                    validity: 1.0,
                    uniqueness: 1.0,
                },
            },
        ]));
        logger.info({
            jobId: jobData.job_id,
            recordsProcessed: rawData.length,
            runId,
        }, 'Ingestion job completed');
    }
    catch (error) {
        logger.error({
            jobId: jobData.job_id,
            error: error.message,
            runId,
        }, 'Ingestion job failed');
        // Emit FAIL event
        await lineageClient.emitEvent(lineageClient.createRunEvent('FAIL', `ingest-${jobData.source_type}`, runId));
        throw error;
    }
});
transformQueue.process('transform-data', 3, async (job) => {
    const { job_id, raw_data, transform_rules, run_id } = job.data;
    try {
        logger.info({
            jobId: job_id,
            runId: run_id,
        }, 'Starting data transformation');
        // Apply transformation rules
        let transformedData = raw_data;
        for (const rule of transform_rules) {
            switch (rule.type) {
                case 'entity_extraction':
                    transformedData = transformedData.map((record) => ({
                        ...record,
                        entity_type: rule.entity_type || 'unknown',
                        extracted_at: new Date().toISOString(),
                    }));
                    break;
                case 'field_mapping':
                    transformedData = transformedData.map((record) => {
                        const mapped = {};
                        for (const [sourceField, targetField] of Object.entries(rule.mapping)) {
                            mapped[targetField] = record[sourceField];
                        }
                        return { ...record, ...mapped };
                    });
                    break;
                case 'data_enrichment':
                    // Mock enrichment
                    transformedData = transformedData.map((record) => ({
                        ...record,
                        enriched: true,
                        confidence: 0.95,
                    }));
                    break;
            }
        }
        // Store transformed data
        await graphStorage.storeEntities(transformedData, job_id);
        // Extract relationships if configured
        const relationships = extractRelationships(transformedData);
        if (relationships.length > 0) {
            await graphStorage.createRelationships(relationships, job_id);
        }
        logger.info({
            jobId: job_id,
            inputRecords: raw_data.length,
            outputRecords: transformedData.length,
            relationships: relationships.length,
        }, 'Transformation completed');
    }
    catch (error) {
        logger.error({
            jobId: job_id,
            error: error.message,
        }, 'Transformation failed');
        throw error;
    }
});
function extractRelationships(data) {
    // Mock relationship extraction
    const relationships = [];
    for (let i = 0; i < data.length - 1; i++) {
        relationships.push({
            source: data[i].id,
            target: data[i + 1].id,
            type: 'RELATED_TO',
            properties: {
                confidence: 0.8,
                detected_by: 'feed-processor',
            },
        });
    }
    return relationships;
}
// Health monitoring
setInterval(async () => {
    try {
        const waiting = await ingestionQueue.getWaitingCount();
        const active = await ingestionQueue.getActiveCount();
        const completed = await ingestionQueue.getCompletedCount();
        const failed = await ingestionQueue.getFailedCount();
        logger.info({
            ingestion: { waiting, active, completed, failed },
        }, 'Queue health');
    }
    catch (error) {
        logger.error({ err: error }, 'Health check failed');
    }
}, 30000);
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('Shutting down feed processor...');
    await ingestionQueue.close();
    await transformQueue.close();
    await redis.quit();
    await neo4jDriver.close();
    await pgPool.end();
    process.exit(0);
});
logger.info('🔄 Feed Processor started');
logger.info('Processing queues: ingestion, transformation');
logger.info('OpenLineage integration enabled');
logger.info('License enforcement active');
