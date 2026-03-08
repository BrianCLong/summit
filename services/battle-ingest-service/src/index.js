"use strict";
/**
 * Battle Ingest Service
 * Ingests data from sensor grids, satellites, comms, cyber feeds, and external sources
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const kafkajs_1 = require("kafkajs");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const battle_fusion_1 = require("@intelgraph/battle-fusion");
// =============================================================================
// CONFIGURATION
// =============================================================================
const config = {
    port: parseInt(process.env.PORT || '3010'),
    kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    kafkaClientId: process.env.KAFKA_CLIENT_ID || 'battle-ingest-service',
    logLevel: process.env.LOG_LEVEL || 'info',
};
const logger = (0, pino_1.default)({
    level: config.logLevel,
    transport: {
        target: 'pino-pretty',
        options: { colorize: true },
    },
});
// =============================================================================
// KAFKA TOPICS
// =============================================================================
const TOPICS = {
    RAW_INGEST: 'battles.raw.ingest',
    NORMALIZED_EVENTS: 'battles.normalized.events',
    SENSOR_GRID: 'battles.domain.sensor-grid',
    SATELLITE: 'battles.domain.satellite',
    COMMS: 'battles.domain.comms',
    CYBER: 'battles.domain.cyber',
    EXTERNAL: 'battles.domain.external',
    DEAD_LETTER: 'battles.dlq.ingest',
};
// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================
const GeoLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    altitude: zod_1.z.number().optional(),
    accuracy: zod_1.z.number().optional(),
});
const SensorReadingSchema = zod_1.z.object({
    sensorId: zod_1.z.string(),
    sensorType: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    location: GeoLocationSchema,
    detections: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.enum(['CONTACT', 'SIGNAL', 'ANOMALY', 'TRACK']),
        classification: zod_1.z.string().optional(),
        location: GeoLocationSchema,
        bearing: zod_1.z.number().optional(),
        range: zod_1.z.number().optional(),
        confidence: zod_1.z.number().min(0).max(1),
    })),
});
const SatelliteImagerySchema = zod_1.z.object({
    imageId: zod_1.z.string(),
    satelliteId: zod_1.z.string(),
    captureTime: zod_1.z.string().datetime(),
    boundingBox: zod_1.z.object({
        northWest: GeoLocationSchema,
        southEast: GeoLocationSchema,
    }),
    resolution: zod_1.z.number(),
    analysisResults: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        location: GeoLocationSchema,
        confidence: zod_1.z.number(),
        classification: zod_1.z.string().optional(),
    })).optional(),
});
const CommsInterceptSchema = zod_1.z.object({
    interceptId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    frequency: zod_1.z.number().optional(),
    protocol: zod_1.z.string().optional(),
    sourceLocation: GeoLocationSchema.optional(),
    targetLocation: GeoLocationSchema.optional(),
    contentType: zod_1.z.enum(['VOICE', 'DATA', 'VIDEO', 'ENCRYPTED']),
});
const CyberEventSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    eventType: zod_1.z.enum([
        'INTRUSION',
        'MALWARE',
        'DOS',
        'DATA_EXFIL',
        'RECONNAISSANCE',
        'LATERAL_MOVEMENT',
    ]),
    severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
    sourceIp: zod_1.z.string().optional(),
    targetIp: zod_1.z.string().optional(),
    targetAsset: zod_1.z.string().optional(),
    indicators: zod_1.z.array(zod_1.z.string()),
    ttps: zod_1.z.array(zod_1.z.string()).optional(),
});
// =============================================================================
// DATA SOURCE REGISTRY
// =============================================================================
const sourceRegistry = new Map([
    [
        'sensor-grid-alpha',
        {
            id: 'sensor-grid-alpha',
            name: 'Sensor Grid Alpha',
            domain: 'SENSOR_GRID',
            reliability: 'B',
            credibility: 2,
            lastContact: new Date(),
        },
    ],
    [
        'sat-keyhole-7',
        {
            id: 'sat-keyhole-7',
            name: 'Keyhole-7 Satellite',
            domain: 'SATELLITE',
            reliability: 'A',
            credibility: 1,
            lastContact: new Date(),
        },
    ],
    [
        'sigint-station-bravo',
        {
            id: 'sigint-station-bravo',
            name: 'SIGINT Station Bravo',
            domain: 'COMMS',
            reliability: 'C',
            credibility: 3,
            lastContact: new Date(),
        },
    ],
    [
        'cyber-soc',
        {
            id: 'cyber-soc',
            name: 'Cyber SOC',
            domain: 'CYBER',
            reliability: 'B',
            credibility: 2,
            lastContact: new Date(),
        },
    ],
]);
// =============================================================================
// KAFKA SETUP
// =============================================================================
const kafka = new kafkajs_1.Kafka({
    clientId: config.kafkaClientId,
    brokers: config.kafkaBrokers,
    logLevel: kafkajs_1.logLevel.WARN,
});
let producer;
async function initKafka() {
    producer = kafka.producer();
    await producer.connect();
    logger.info('Kafka producer connected');
    // Create topics if needed (admin operation)
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
        topics: Object.values(TOPICS).map((topic) => ({
            topic,
            numPartitions: 3,
            replicationFactor: 1,
        })),
        waitForLeaders: true,
    });
    await admin.disconnect();
    logger.info('Kafka topics created');
}
async function publishEvent(topic, event) {
    await producer.send({
        topic,
        messages: [
            {
                key: event.correlationId,
                value: JSON.stringify(event),
                timestamp: event.timestamp.toISOString(),
                headers: {
                    eventType: event.eventType,
                    sourceService: 'battle-ingest-service',
                },
            },
        ],
    });
}
async function publishToDLQ(originalEvent, error, sourceId) {
    await producer.send({
        topic: TOPICS.DEAD_LETTER,
        messages: [
            {
                key: sourceId,
                value: JSON.stringify({
                    originalEvent,
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                }),
            },
        ],
    });
}
// =============================================================================
// INGEST HANDLERS
// =============================================================================
async function ingestSensorData(sourceId, payload) {
    const validated = SensorReadingSchema.parse(payload);
    const normalizedEvents = (0, battle_fusion_1.normalizeSensorReading)(validated, sourceId);
    const correlationId = (0, uuid_1.v4)();
    for (const event of normalizedEvents) {
        await publishEvent(TOPICS.NORMALIZED_EVENTS, {
            eventType: 'ENTITY_DETECTED',
            timestamp: new Date(),
            correlationId,
            payload: event,
            metadata: {
                sourceService: 'battle-ingest-service',
                version: '1.0.0',
            },
        });
    }
    // Also publish raw to domain-specific topic
    await publishEvent(TOPICS.SENSOR_GRID, {
        eventType: 'ENTITY_DETECTED',
        timestamp: new Date(),
        correlationId,
        payload: validated,
        metadata: {
            sourceService: 'battle-ingest-service',
            version: '1.0.0',
        },
    });
    logger.info({ sourceId, detectionCount: normalizedEvents.length }, 'Sensor data ingested');
}
async function ingestSatelliteData(sourceId, payload) {
    const validated = SatelliteImagerySchema.parse(payload);
    const normalizedEvents = (0, battle_fusion_1.normalizeSatelliteImagery)(validated, sourceId);
    const correlationId = (0, uuid_1.v4)();
    for (const event of normalizedEvents) {
        await publishEvent(TOPICS.NORMALIZED_EVENTS, {
            eventType: 'ENTITY_DETECTED',
            timestamp: new Date(),
            correlationId,
            payload: event,
            metadata: {
                sourceService: 'battle-ingest-service',
                version: '1.0.0',
            },
        });
    }
    await publishEvent(TOPICS.SATELLITE, {
        eventType: 'ENTITY_DETECTED',
        timestamp: new Date(),
        correlationId,
        payload: validated,
        metadata: {
            sourceService: 'battle-ingest-service',
            version: '1.0.0',
        },
    });
    logger.info({ sourceId, imageId: validated.imageId }, 'Satellite imagery ingested');
}
async function ingestCommsData(sourceId, payload) {
    const validated = CommsInterceptSchema.parse(payload);
    const normalizedEvent = (0, battle_fusion_1.normalizeCommsIntercept)(validated, sourceId);
    const correlationId = (0, uuid_1.v4)();
    await publishEvent(TOPICS.NORMALIZED_EVENTS, {
        eventType: 'ENTITY_DETECTED',
        timestamp: new Date(),
        correlationId,
        payload: normalizedEvent,
        metadata: {
            sourceService: 'battle-ingest-service',
            version: '1.0.0',
        },
    });
    await publishEvent(TOPICS.COMMS, {
        eventType: 'ENTITY_DETECTED',
        timestamp: new Date(),
        correlationId,
        payload: validated,
        metadata: {
            sourceService: 'battle-ingest-service',
            version: '1.0.0',
        },
    });
    logger.info({ sourceId, interceptId: validated.interceptId }, 'Comms intercept ingested');
}
async function ingestCyberData(sourceId, payload) {
    const validated = CyberEventSchema.parse(payload);
    const normalizedEvent = (0, battle_fusion_1.normalizeCyberEvent)(validated, sourceId);
    const correlationId = (0, uuid_1.v4)();
    await publishEvent(TOPICS.NORMALIZED_EVENTS, {
        eventType: 'ENTITY_DETECTED',
        timestamp: new Date(),
        correlationId,
        payload: normalizedEvent,
        metadata: {
            sourceService: 'battle-ingest-service',
            version: '1.0.0',
        },
    });
    await publishEvent(TOPICS.CYBER, {
        eventType: 'ENTITY_DETECTED',
        timestamp: new Date(),
        correlationId,
        payload: validated,
        metadata: {
            sourceService: 'battle-ingest-service',
            version: '1.0.0',
        },
    });
    logger.info({ sourceId, eventId: validated.eventId, severity: validated.severity }, 'Cyber event ingested');
}
// =============================================================================
// EXPRESS SERVER
// =============================================================================
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '10mb' }));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'battle-ingest-service' });
});
// Generic ingest endpoint
app.post('/ingest', async (req, res) => {
    const { sourceId, domain, payload } = req.body;
    if (!sourceId || !domain || !payload) {
        return res.status(400).json({ error: 'Missing sourceId, domain, or payload' });
    }
    try {
        const domainHandlers = {
            SENSOR_GRID: ingestSensorData,
            SATELLITE: ingestSatelliteData,
            COMMS: ingestCommsData,
            CYBER: ingestCyberData,
            HUMINT: async () => { throw new Error('HUMINT handler not implemented'); },
            SIGINT: ingestCommsData, // Route SIGINT to comms handler
            IMINT: ingestSatelliteData, // Route IMINT to satellite handler
            GEOINT: ingestSatelliteData,
            OSINT: async () => { throw new Error('OSINT handler not implemented'); },
            ELINT: ingestCommsData,
            MASINT: ingestSensorData,
            EXTERNAL: async () => { throw new Error('External handler not implemented'); },
        };
        const handler = domainHandlers[domain];
        if (!handler) {
            return res.status(400).json({ error: `Unknown domain: ${domain}` });
        }
        await handler(sourceId, payload);
        // Update source last contact
        const source = sourceRegistry.get(sourceId);
        if (source) {
            source.lastContact = new Date();
        }
        res.json({ status: 'accepted', correlationId: (0, uuid_1.v4)() });
    }
    catch (error) {
        logger.error({ error, sourceId, domain }, 'Ingest failed');
        // Send to DLQ
        await publishToDLQ(payload, error, sourceId);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Domain-specific endpoints
app.post('/ingest/sensor', async (req, res) => {
    const { sourceId, payload } = req.body;
    try {
        await ingestSensorData(sourceId || 'sensor-grid-alpha', payload);
        res.json({ status: 'accepted' });
    }
    catch (error) {
        logger.error({ error }, 'Sensor ingest failed');
        res.status(400).json({ error: error.message });
    }
});
app.post('/ingest/satellite', async (req, res) => {
    const { sourceId, payload } = req.body;
    try {
        await ingestSatelliteData(sourceId || 'sat-keyhole-7', payload);
        res.json({ status: 'accepted' });
    }
    catch (error) {
        logger.error({ error }, 'Satellite ingest failed');
        res.status(400).json({ error: error.message });
    }
});
app.post('/ingest/comms', async (req, res) => {
    const { sourceId, payload } = req.body;
    try {
        await ingestCommsData(sourceId || 'sigint-station-bravo', payload);
        res.json({ status: 'accepted' });
    }
    catch (error) {
        logger.error({ error }, 'Comms ingest failed');
        res.status(400).json({ error: error.message });
    }
});
app.post('/ingest/cyber', async (req, res) => {
    const { sourceId, payload } = req.body;
    try {
        await ingestCyberData(sourceId || 'cyber-soc', payload);
        res.json({ status: 'accepted' });
    }
    catch (error) {
        logger.error({ error }, 'Cyber ingest failed');
        res.status(400).json({ error: error.message });
    }
});
// Source management
app.get('/sources', (req, res) => {
    res.json(Array.from(sourceRegistry.values()));
});
app.post('/sources', (req, res) => {
    const source = req.body;
    source.lastContact = new Date();
    sourceRegistry.set(source.id, source);
    res.json({ status: 'registered', source });
});
// =============================================================================
// STARTUP
// =============================================================================
async function start() {
    try {
        await initKafka();
        app.listen(config.port, () => {
            logger.info({ port: config.port }, 'Battle Ingest Service started');
        });
    }
    catch (error) {
        logger.error({ error }, 'Failed to start service');
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await producer?.disconnect();
    process.exit(0);
});
start();
