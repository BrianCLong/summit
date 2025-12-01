/**
 * Battle Fusion Service
 * Creates a single source of operational truth from multidomain data
 */

import express from 'express';
import { Kafka, Consumer, Producer, logLevel } from 'kafkajs';
import Redis from 'ioredis';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

import type {
  BattleEvent,
  FusionResult,
  NormalizedIngestEvent,
  SituationalPicture,
  Scenario,
  ScenarioEvent,
} from '@intelgraph/battle-types';

import { FusionEngine } from '@intelgraph/battle-fusion';

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  port: parseInt(process.env.PORT || '3011'),
  wsPort: parseInt(process.env.WS_PORT || '3012'),
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'battle-fusion-service',
  kafkaGroupId: process.env.KAFKA_GROUP_ID || 'battle-fusion-group',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  fusionIntervalMs: parseInt(process.env.FUSION_INTERVAL_MS || '1000'),
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
  NORMALIZED_EVENTS: 'battles.normalized.events',
  FUSION_RESULTS: 'battles.fusion.results',
  SITUATIONAL_PICTURE: 'battles.situational.picture',
  ALERTS: 'battles.alerts',
  COMMANDS: 'battles.commands',
};

// =============================================================================
// CORE SERVICES
// =============================================================================

const fusionEngine = new FusionEngine({
  conflictResolution: 'HIGHEST_CONFIDENCE',
  correlationThreshold: 0.6,
  maxEntityAge: 300000, // 5 minutes
});

const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers,
  logLevel: logLevel.WARN,
});

let consumer: Consumer;
let producer: Producer;
let redis: Redis;

// WebSocket clients for real-time updates
const wsClients = new Set<WebSocket>();

// Active scenarios
const activeScenarios = new Map<string, Scenario>();

// Current situational picture
let currentSituationalPicture: SituationalPicture | null = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

async function initKafka(): Promise<void> {
  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: config.kafkaGroupId });

  await producer.connect();
  await consumer.connect();

  await consumer.subscribe({
    topic: TOPICS.NORMALIZED_EVENTS,
    fromBeginning: false,
  });

  logger.info('Kafka connected');
}

async function initRedis(): Promise<void> {
  redis = new Redis(config.redisUrl);
  redis.on('error', (err) => logger.error({ err }, 'Redis error'));
  logger.info('Redis connected');
}

function initWebSocket(): void {
  const wss = new WebSocketServer({ port: config.wsPort });

  wss.on('connection', (ws) => {
    wsClients.add(ws);
    logger.info('WebSocket client connected');

    // Send current situational picture to new client
    if (currentSituationalPicture) {
      ws.send(
        JSON.stringify({
          type: 'SITUATIONAL_PICTURE',
          data: currentSituationalPicture,
        }),
      );
    }

    ws.on('close', () => {
      wsClients.delete(ws);
      logger.info('WebSocket client disconnected');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message);
      } catch (err) {
        logger.error({ err }, 'Invalid WebSocket message');
      }
    });
  });

  logger.info({ port: config.wsPort }, 'WebSocket server started');
}

function handleWebSocketMessage(ws: WebSocket, message: any): void {
  switch (message.type) {
    case 'SUBSCRIBE_SCENARIO':
      // Handle scenario subscription
      break;
    case 'REQUEST_SITUATIONAL_PICTURE':
      if (currentSituationalPicture) {
        ws.send(
          JSON.stringify({
            type: 'SITUATIONAL_PICTURE',
            data: currentSituationalPicture,
          }),
        );
      }
      break;
    default:
      logger.warn({ type: message.type }, 'Unknown WebSocket message type');
  }
}

function broadcastToClients(message: object): void {
  const payload = JSON.stringify(message);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// =============================================================================
// KAFKA CONSUMPTION
// =============================================================================

async function startConsumer(): Promise<void> {
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || '{}') as BattleEvent;
        await processIngestEvent(event);
      } catch (err) {
        logger.error({ err, topic, partition }, 'Error processing message');
      }
    },
  });

  logger.info('Kafka consumer started');
}

async function processIngestEvent(event: BattleEvent): Promise<void> {
  if (event.eventType === 'ENTITY_DETECTED' || event.eventType === 'ENTITY_UPDATED') {
    const normalizedEvent = event.payload as NormalizedIngestEvent;
    fusionEngine.ingestEvent(normalizedEvent);
  }
}

// =============================================================================
// FUSION CYCLE
// =============================================================================

let fusionInterval: NodeJS.Timeout;

function startFusionCycle(): void {
  fusionInterval = setInterval(async () => {
    try {
      const result = await fusionEngine.executeFusion();

      if (result.entities.length > 0) {
        // Update situational picture
        currentSituationalPicture = result.situationalPicture;

        // Publish fusion result
        await publishFusionResult(result);

        // Broadcast to WebSocket clients
        broadcastToClients({
          type: 'FUSION_UPDATE',
          data: {
            fusionId: result.fusionId,
            timestamp: result.timestamp,
            entityCount: result.entities.length,
            confidence: result.confidence,
          },
        });

        broadcastToClients({
          type: 'SITUATIONAL_PICTURE',
          data: currentSituationalPicture,
        });

        // Cache in Redis
        await cacheResults(result);

        // Check for alerts
        await checkAlerts(result);

        logger.info(
          {
            fusionId: result.fusionId,
            entities: result.entities.length,
            correlations: result.correlations.length,
          },
          'Fusion cycle completed',
        );
      }

      // Clear stale entities
      const cleared = fusionEngine.clearStaleEntities();
      if (cleared > 0) {
        logger.debug({ cleared }, 'Cleared stale entities');
      }
    } catch (err) {
      logger.error({ err }, 'Fusion cycle error');
    }
  }, config.fusionIntervalMs);

  logger.info({ intervalMs: config.fusionIntervalMs }, 'Fusion cycle started');
}

async function publishFusionResult(result: FusionResult): Promise<void> {
  await producer.send({
    topic: TOPICS.FUSION_RESULTS,
    messages: [
      {
        key: result.fusionId,
        value: JSON.stringify(result),
        timestamp: result.timestamp.toISOString(),
      },
    ],
  });

  await producer.send({
    topic: TOPICS.SITUATIONAL_PICTURE,
    messages: [
      {
        key: `sitrep-${Date.now()}`,
        value: JSON.stringify(result.situationalPicture),
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

async function cacheResults(result: FusionResult): Promise<void> {
  // Cache situational picture
  await redis.setex(
    'battle:sitrep:current',
    300, // 5 minute TTL
    JSON.stringify(result.situationalPicture),
  );

  // Cache fused entities
  for (const entity of result.entities) {
    await redis.setex(
      `battle:entity:${entity.canonicalId}`,
      300,
      JSON.stringify(entity),
    );
  }

  // Add to time-series stream
  await redis.xadd(
    'battle:fusion:stream',
    'MAXLEN',
    '~',
    '1000',
    '*',
    'fusionId',
    result.fusionId,
    'timestamp',
    result.timestamp.toISOString(),
    'entityCount',
    result.entities.length.toString(),
    'confidence',
    result.confidence.toString(),
  );
}

async function checkAlerts(result: FusionResult): Promise<void> {
  // Check for critical threats
  const criticalThreats = result.situationalPicture.threats.filter(
    (t) => t.threatLevel === 'CRITICAL',
  );

  for (const threat of criticalThreats) {
    const alert: BattleEvent = {
      eventType: 'ALERT',
      timestamp: new Date(),
      correlationId: uuidv4(),
      payload: {
        alertType: 'CRITICAL_THREAT',
        threatId: threat.id,
        entityId: threat.entityId,
        threatLevel: threat.threatLevel,
        message: `Critical threat detected: ${threat.threatType}`,
      },
      metadata: {
        sourceService: 'battle-fusion-service',
        version: '1.0.0',
      },
    };

    await producer.send({
      topic: TOPICS.ALERTS,
      messages: [
        {
          key: threat.id,
          value: JSON.stringify(alert),
        },
      ],
    });

    broadcastToClients({
      type: 'ALERT',
      data: alert.payload,
    });

    logger.warn({ threatId: threat.id }, 'Critical threat alert generated');
  }
}

// =============================================================================
// SCENARIO SIMULATION
// =============================================================================

function createScenario(params: {
  name: string;
  description?: string;
  timeScale: number;
  initialState?: SituationalPicture;
}): Scenario {
  const scenario: Scenario = {
    id: uuidv4(),
    name: params.name,
    description: params.description,
    createdAt: new Date(),
    createdBy: 'system',
    status: 'DRAFT',
    timeScale: params.timeScale,
    startTime: new Date(),
    currentTime: new Date(),
    initialState: params.initialState || currentSituationalPicture!,
    events: [],
    outcomes: [],
  };

  activeScenarios.set(scenario.id, scenario);
  return scenario;
}

function addScenarioEvent(
  scenarioId: string,
  event: Omit<ScenarioEvent, 'id' | 'executed'>,
): ScenarioEvent | null {
  const scenario = activeScenarios.get(scenarioId);
  if (!scenario) return null;

  const scenarioEvent: ScenarioEvent = {
    ...event,
    id: uuidv4(),
    executed: false,
  };

  scenario.events.push(scenarioEvent);
  return scenarioEvent;
}

function startScenario(scenarioId: string): boolean {
  const scenario = activeScenarios.get(scenarioId);
  if (!scenario || scenario.status === 'ACTIVE') return false;

  scenario.status = 'ACTIVE';
  scenario.startTime = new Date();
  scenario.currentTime = new Date();

  // Start scenario event loop
  const interval = setInterval(() => {
    if (scenario.status !== 'ACTIVE') {
      clearInterval(interval);
      return;
    }

    // Advance scenario time
    const elapsed = (Date.now() - scenario.startTime.getTime()) * scenario.timeScale;
    scenario.currentTime = new Date(scenario.startTime.getTime() + elapsed);

    // Execute due events
    for (const event of scenario.events) {
      if (!event.executed && event.scheduledTime <= scenario.currentTime) {
        executeScenarioEvent(scenario, event);
      }
    }

    // Broadcast scenario update
    broadcastToClients({
      type: 'SCENARIO_UPDATE',
      data: {
        scenarioId: scenario.id,
        currentTime: scenario.currentTime,
        status: scenario.status,
      },
    });
  }, 1000);

  logger.info({ scenarioId, name: scenario.name }, 'Scenario started');
  return true;
}

function executeScenarioEvent(scenario: Scenario, event: ScenarioEvent): void {
  event.executed = true;

  // Inject event into fusion engine
  const syntheticEvent: NormalizedIngestEvent = {
    eventId: `scenario-${event.id}`,
    sourceId: `scenario-${scenario.id}`,
    domain: 'EXTERNAL',
    timestamp: scenario.currentTime,
    normalizedAt: new Date(),
    entityType: event.eventType,
    confidence: 1.0,
    data: event.parameters,
    provenance: {
      sourceId: `scenario-${scenario.id}`,
      sourceDomain: 'EXTERNAL',
      reliability: 'A',
      credibility: 1,
      transformations: ['scenario-injection'],
      correlationIds: [scenario.id, event.id],
    },
  };

  fusionEngine.ingestEvent(syntheticEvent);

  broadcastToClients({
    type: 'SCENARIO_EVENT_EXECUTED',
    data: {
      scenarioId: scenario.id,
      eventId: event.id,
      eventType: event.eventType,
    },
  });

  logger.info(
    { scenarioId: scenario.id, eventId: event.id },
    'Scenario event executed',
  );
}

// =============================================================================
// EXPRESS SERVER
// =============================================================================

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'battle-fusion-service',
    fusionCycleActive: !!fusionInterval,
    cachedEntities: fusionEngine.getEntityCache().size,
  });
});

// Get current situational picture
app.get('/sitrep', async (req, res) => {
  const cached = await redis.get('battle:sitrep:current');
  if (cached) {
    res.json(JSON.parse(cached));
  } else if (currentSituationalPicture) {
    res.json(currentSituationalPicture);
  } else {
    res.status(404).json({ error: 'No situational picture available' });
  }
});

// Get entity by ID
app.get('/entities/:id', async (req, res) => {
  const cached = await redis.get(`battle:entity:${req.params.id}`);
  if (cached) {
    res.json(JSON.parse(cached));
  } else {
    const entity = fusionEngine.getEntityCache().get(req.params.id);
    if (entity) {
      res.json(entity);
    } else {
      res.status(404).json({ error: 'Entity not found' });
    }
  }
});

// Get all fused entities
app.get('/entities', (req, res) => {
  const entities = Array.from(fusionEngine.getEntityCache().values());
  res.json(entities);
});

// Scenario management
app.post('/scenarios', (req, res) => {
  const scenario = createScenario(req.body);
  res.json(scenario);
});

app.get('/scenarios', (req, res) => {
  res.json(Array.from(activeScenarios.values()));
});

app.get('/scenarios/:id', (req, res) => {
  const scenario = activeScenarios.get(req.params.id);
  if (scenario) {
    res.json(scenario);
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});

app.post('/scenarios/:id/events', (req, res) => {
  const event = addScenarioEvent(req.params.id, req.body);
  if (event) {
    res.json(event);
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});

app.post('/scenarios/:id/start', (req, res) => {
  const success = startScenario(req.params.id);
  if (success) {
    res.json({ status: 'started' });
  } else {
    res.status(400).json({ error: 'Could not start scenario' });
  }
});

app.post('/scenarios/:id/pause', (req, res) => {
  const scenario = activeScenarios.get(req.params.id);
  if (scenario) {
    scenario.status = 'PAUSED';
    res.json({ status: 'paused' });
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});

// Fusion metrics
app.get('/metrics', async (req, res) => {
  const stream = await redis.xrange('battle:fusion:stream', '-', '+', 'COUNT', '100');
  res.json({
    entityCount: fusionEngine.getEntityCache().size,
    activeScenarios: activeScenarios.size,
    recentFusions: stream.map((entry) => ({
      id: entry[0],
      data: Object.fromEntries(
        entry[1].reduce((acc: [string, string][], val, idx, arr) => {
          if (idx % 2 === 0) acc.push([val, arr[idx + 1]]);
          return acc;
        }, []),
      ),
    })),
  });
});

// =============================================================================
// STARTUP
// =============================================================================

async function start(): Promise<void> {
  try {
    await initKafka();
    await initRedis();
    initWebSocket();
    await startConsumer();
    startFusionCycle();

    app.listen(config.port, () => {
      logger.info({ port: config.port }, 'Battle Fusion Service started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start service');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  clearInterval(fusionInterval);
  await consumer?.disconnect();
  await producer?.disconnect();
  redis?.disconnect();
  process.exit(0);
});

start();
