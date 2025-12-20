/**
 * Battle Ingest Service
 * Ingests data from sensor grids, satellites, comms, cyber feeds, and external sources
 */

import express from 'express';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { z } from 'zod';

import type {
  RawIngestEvent,
  DataDomain,
  DataSource,
  BattleEvent,
} from '@intelgraph/battle-types';

import {
  normalizeSensorReading,
  normalizeSatelliteImagery,
  normalizeCommsIntercept,
  normalizeCyberEvent,
} from '@intelgraph/battle-fusion';

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  port: parseInt(process.env.PORT || '3010'),
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'battle-ingest-service',
  logLevel: process.env.LOG_LEVEL || 'info',
};

const logger = pino({
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

const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
});

const SensorReadingSchema = z.object({
  sensorId: z.string(),
  sensorType: z.string(),
  timestamp: z.string().datetime(),
  location: GeoLocationSchema,
  detections: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['CONTACT', 'SIGNAL', 'ANOMALY', 'TRACK']),
      classification: z.string().optional(),
      location: GeoLocationSchema,
      bearing: z.number().optional(),
      range: z.number().optional(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

const SatelliteImagerySchema = z.object({
  imageId: z.string(),
  satelliteId: z.string(),
  captureTime: z.string().datetime(),
  boundingBox: z.object({
    northWest: GeoLocationSchema,
    southEast: GeoLocationSchema,
  }),
  resolution: z.number(),
  analysisResults: z.array(
    z.object({
      type: z.string(),
      location: GeoLocationSchema,
      confidence: z.number(),
      classification: z.string().optional(),
    }),
  ).optional(),
});

const CommsInterceptSchema = z.object({
  interceptId: z.string(),
  timestamp: z.string().datetime(),
  frequency: z.number().optional(),
  protocol: z.string().optional(),
  sourceLocation: GeoLocationSchema.optional(),
  targetLocation: GeoLocationSchema.optional(),
  contentType: z.enum(['VOICE', 'DATA', 'VIDEO', 'ENCRYPTED']),
});

const CyberEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string().datetime(),
  eventType: z.enum([
    'INTRUSION',
    'MALWARE',
    'DOS',
    'DATA_EXFIL',
    'RECONNAISSANCE',
    'LATERAL_MOVEMENT',
  ]),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
  sourceIp: z.string().optional(),
  targetIp: z.string().optional(),
  targetAsset: z.string().optional(),
  indicators: z.array(z.string()),
  ttps: z.array(z.string()).optional(),
});

// =============================================================================
// DATA SOURCE REGISTRY
// =============================================================================

const sourceRegistry = new Map<string, DataSource>([
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

const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers,
  logLevel: logLevel.WARN,
});

let producer: Producer;

async function initKafka(): Promise<void> {
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

async function publishEvent(topic: string, event: BattleEvent): Promise<void> {
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

async function publishToDLQ(
  originalEvent: unknown,
  error: Error,
  sourceId: string,
): Promise<void> {
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

async function ingestSensorData(
  sourceId: string,
  payload: unknown,
): Promise<void> {
  const validated = SensorReadingSchema.parse(payload);
  const normalizedEvents = normalizeSensorReading(validated, sourceId);

  const correlationId = uuidv4();

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

  logger.info(
    { sourceId, detectionCount: normalizedEvents.length },
    'Sensor data ingested',
  );
}

async function ingestSatelliteData(
  sourceId: string,
  payload: unknown,
): Promise<void> {
  const validated = SatelliteImagerySchema.parse(payload);
  const normalizedEvents = normalizeSatelliteImagery(validated, sourceId);

  const correlationId = uuidv4();

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

  logger.info(
    { sourceId, imageId: validated.imageId },
    'Satellite imagery ingested',
  );
}

async function ingestCommsData(
  sourceId: string,
  payload: unknown,
): Promise<void> {
  const validated = CommsInterceptSchema.parse(payload);
  const normalizedEvent = normalizeCommsIntercept(validated, sourceId);

  const correlationId = uuidv4();

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

  logger.info(
    { sourceId, interceptId: validated.interceptId },
    'Comms intercept ingested',
  );
}

async function ingestCyberData(
  sourceId: string,
  payload: unknown,
): Promise<void> {
  const validated = CyberEventSchema.parse(payload);
  const normalizedEvent = normalizeCyberEvent(validated, sourceId);

  const correlationId = uuidv4();

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

  logger.info(
    { sourceId, eventId: validated.eventId, severity: validated.severity },
    'Cyber event ingested',
  );
}

// =============================================================================
// EXPRESS SERVER
// =============================================================================

const app = express();
app.use(express.json({ limit: '10mb' }));

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
    const domainHandlers: Record<DataDomain, (sid: string, p: unknown) => Promise<void>> = {
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

    const handler = domainHandlers[domain as DataDomain];
    if (!handler) {
      return res.status(400).json({ error: `Unknown domain: ${domain}` });
    }

    await handler(sourceId, payload);

    // Update source last contact
    const source = sourceRegistry.get(sourceId);
    if (source) {
      source.lastContact = new Date();
    }

    res.json({ status: 'accepted', correlationId: uuidv4() });
  } catch (error) {
    logger.error({ error, sourceId, domain }, 'Ingest failed');

    // Send to DLQ
    await publishToDLQ(payload, error as Error, sourceId);

    if (error instanceof z.ZodError) {
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
  } catch (error) {
    logger.error({ error }, 'Sensor ingest failed');
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/ingest/satellite', async (req, res) => {
  const { sourceId, payload } = req.body;
  try {
    await ingestSatelliteData(sourceId || 'sat-keyhole-7', payload);
    res.json({ status: 'accepted' });
  } catch (error) {
    logger.error({ error }, 'Satellite ingest failed');
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/ingest/comms', async (req, res) => {
  const { sourceId, payload } = req.body;
  try {
    await ingestCommsData(sourceId || 'sigint-station-bravo', payload);
    res.json({ status: 'accepted' });
  } catch (error) {
    logger.error({ error }, 'Comms ingest failed');
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/ingest/cyber', async (req, res) => {
  const { sourceId, payload } = req.body;
  try {
    await ingestCyberData(sourceId || 'cyber-soc', payload);
    res.json({ status: 'accepted' });
  } catch (error) {
    logger.error({ error }, 'Cyber ingest failed');
    res.status(400).json({ error: (error as Error).message });
  }
});

// Source management
app.get('/sources', (req, res) => {
  res.json(Array.from(sourceRegistry.values()));
});

app.post('/sources', (req, res) => {
  const source = req.body as DataSource;
  source.lastContact = new Date();
  sourceRegistry.set(source.id, source);
  res.json({ status: 'registered', source });
});

// =============================================================================
// STARTUP
// =============================================================================

async function start(): Promise<void> {
  try {
    await initKafka();

    app.listen(config.port, () => {
      logger.info({ port: config.port }, 'Battle Ingest Service started');
    });
  } catch (error) {
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
