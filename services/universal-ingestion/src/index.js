"use strict";
/**
 * Universal Ingestion Service
 *
 * Provides HTTP API for data ingestion with ETL and license-aware policy enforcement.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.etlAssistant = exports.server = void 0;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const etl_assistant_1 = require("@intelgraph/etl-assistant");
const event_bus_1 = require("./event-bus");
const PORT = parseInt(process.env.PORT || '4040');
const NODE_ENV = process.env.NODE_ENV || 'development';
const LICENSE_REGISTRY_URL = process.env.LICENSE_REGISTRY_URL || 'http://localhost:4030';
// Schemas
const SampleRequestSchema = zod_1.z.object({
    samples: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.any())),
    licenseId: zod_1.z.string(),
    schemaHint: zod_1.z.string().optional(),
});
const RegisterSourceRequestSchema = zod_1.z.object({
    connectorType: zod_1.z.enum(['csv-file', 'rest-pull', 's3-bucket']),
    connectorConfig: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    licenseId: zod_1.z.string(),
    entityType: zod_1.z.string().optional(),
    fieldMappings: zod_1.z
        .array(zod_1.z.object({
        sourceField: zod_1.z.string(),
        targetField: zod_1.z.string(),
        transformation: zod_1.z.string().optional(),
    }))
        .optional(),
    redactionRules: zod_1.z.record(zod_1.z.string(), zod_1.z.enum(['MASK', 'DROP', 'HASH'])).optional(),
});
const ExportCheckRequestSchema = zod_1.z.object({
    licenseId: zod_1.z.string(),
    operation: zod_1.z.enum(['INGEST', 'EXPORT', 'SHARE', 'TRANSFORM']),
    audience: zod_1.z.string().optional(),
    jurisdiction: zod_1.z.string().optional(),
    purpose: zod_1.z.string().optional(),
});
const registeredSources = new Map();
// Create Fastify instance
const server = (0, fastify_1.default)({
    logger: {
        level: NODE_ENV === 'development' ? 'debug' : 'info',
        ...(NODE_ENV === 'development'
            ? { transport: { target: 'pino-pretty' } }
            : {}),
    },
});
exports.server = server;
// Register plugins
server.register(helmet_1.default);
server.register(cors_1.default);
// Initialize ETL Assistant and Event Bus
const etlAssistant = new etl_assistant_1.ETLAssistant();
exports.etlAssistant = etlAssistant;
const eventBus = new event_bus_1.InMemoryEventBus();
exports.eventBus = eventBus;
// Health check
server.get('/health', async () => {
    try {
        // Check license registry connectivity
        const licenseHealthResponse = await axios_1.default.get(`${LICENSE_REGISTRY_URL}/health`, { timeout: 2000 });
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            dependencies: {
                licenseRegistry: licenseHealthResponse.data.status,
                eventBus: 'healthy',
            },
        };
    }
    catch (error) {
        return {
            status: 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            dependencies: {
                licenseRegistry: 'unhealthy',
                eventBus: 'healthy',
            },
        };
    }
});
/**
 * POST /ingest/sources/:sourceId/sample
 *
 * Analyze sample records and return schema inference + PII detection results
 */
server.post('/ingest/sources/:sourceId/sample', async (request, reply) => {
    try {
        const { sourceId } = request.params;
        const { samples, licenseId, schemaHint } = SampleRequestSchema.parse(request.body);
        server.log.info('Analyzing sample records', {
            sourceId,
            sampleCount: samples.length,
            licenseId,
        });
        // Perform schema inference
        const schemaInference = etlAssistant.getSchemaInference();
        const schemaResult = schemaInference.inferSchema(samples, schemaHint);
        // Perform PII detection
        const piiDetection = etlAssistant.getPIIDetection();
        const piiResult = piiDetection.detectPII(samples);
        return {
            sourceId,
            schema: {
                entityType: schemaResult.entityType,
                confidence: schemaResult.confidence,
                fieldMappings: schemaResult.fieldMappings,
                reasoning: schemaResult.reasoning,
            },
            pii: {
                piiFields: piiResult.piiFields,
                riskLevel: piiResult.riskLevel,
                recommendations: piiResult.recommendations,
                summary: piiResult.summary,
            },
            statistics: schemaResult.statistics,
            licenseId,
            analyzedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        server.log.error(error, 'Sample analysis failed');
        reply.status(500);
        return { error: 'Sample analysis failed', message: error.message };
    }
});
/**
 * POST /ingest/sources/:sourceId/register
 *
 * Register a data source with connector config and mappings
 */
server.post('/ingest/sources/:sourceId/register', async (request, reply) => {
    try {
        const { sourceId } = request.params;
        const { connectorType, connectorConfig, licenseId, entityType, fieldMappings, redactionRules, } = RegisterSourceRequestSchema.parse(request.body);
        server.log.info('Registering data source', {
            sourceId,
            connectorType,
            licenseId,
        });
        // Validate license via policy check
        const policyResponse = await axios_1.default.post(`${LICENSE_REGISTRY_URL}/compliance/check`, {
            operation: 'ingest',
            data_source_ids: [sourceId],
            purpose: 'data_ingestion',
        }, {
            headers: {
                'x-authority-id': 'universal-ingestion-service',
                'x-reason-for-access': 'Data source registration',
            },
        });
        const complianceStatus = policyResponse.data.compliance_status;
        const violations = policyResponse.data.violations || [];
        const warnings = policyResponse.data.warnings || [];
        if (complianceStatus === 'block') {
            reply.status(403);
            return {
                error: 'Registration blocked by policy',
                violations,
                appealPath: policyResponse.data.appeal_path,
            };
        }
        // Register source
        const registeredSource = {
            id: sourceId,
            connectorType,
            connectorConfig,
            licenseId,
            entityType: (entityType || 'Document'),
            fieldMappings: fieldMappings || [],
            redactionRules,
            registeredAt: new Date().toISOString(),
        };
        registeredSources.set(sourceId, registeredSource);
        server.log.info('Data source registered successfully', { sourceId });
        return {
            sourceId,
            status: 'registered',
            complianceStatus,
            warnings,
            registeredAt: registeredSource.registeredAt,
        };
    }
    catch (error) {
        server.log.error(error, 'Source registration failed');
        reply.status(500);
        return {
            error: 'Source registration failed',
            message: error.message,
        };
    }
});
/**
 * POST /exports/check
 *
 * Check if an export operation is allowed under license policy
 */
server.post('/exports/check', async (request, reply) => {
    try {
        const { licenseId, operation, audience, jurisdiction, purpose } = ExportCheckRequestSchema.parse(request.body);
        server.log.info('Checking export policy', {
            licenseId,
            operation,
            audience,
            jurisdiction,
        });
        // Call license registry policy engine
        const policyResponse = await axios_1.default.post(`${LICENSE_REGISTRY_URL}/compliance/check`, {
            operation,
            data_source_ids: [licenseId], // Using licenseId as data source for this check
            purpose,
            jurisdiction,
        }, {
            headers: {
                'x-authority-id': 'universal-ingestion-service',
                'x-reason-for-access': `Policy check for ${operation}`,
            },
        });
        const complianceStatus = policyResponse.data.compliance_status;
        const violations = policyResponse.data.violations || [];
        const warnings = policyResponse.data.warnings || [];
        return {
            allow: complianceStatus === 'allow',
            reason: policyResponse.data.human_readable_reason,
            licenseId,
            operation,
            complianceStatus,
            violations,
            warnings,
            context: {
                audience,
                jurisdiction,
                purpose,
            },
            checkedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        server.log.error(error, 'Export check failed');
        reply.status(500);
        return {
            error: 'Export check failed',
            message: error.message,
        };
    }
});
/**
 * GET /ingest/sources/:sourceId
 *
 * Get registered source details
 */
server.get('/ingest/sources/:sourceId', async (request, reply) => {
    const { sourceId } = request.params;
    const source = registeredSources.get(sourceId);
    if (!source) {
        reply.status(404);
        return { error: 'Source not found' };
    }
    return source;
});
/**
 * GET /ingest/sources
 *
 * List all registered sources
 */
server.get('/ingest/sources', async () => {
    return {
        sources: Array.from(registeredSources.values()),
        count: registeredSources.size,
    };
});
// Start server
const start = async () => {
    try {
        await server.listen({ port: PORT, host: '0.0.0.0' });
        server.log.info(`📥 Universal Ingestion Service ready at http://localhost:${PORT}`);
        server.log.info(`   License Registry: ${LICENSE_REGISTRY_URL}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
// Graceful shutdown
process.on('SIGTERM', async () => {
    server.log.info('SIGTERM received, shutting down gracefully');
    await eventBus.close();
    await server.close();
    process.exit(0);
});
start();
