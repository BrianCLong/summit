/**
 * Battle Command Service
 * Command & control, operational planning, decision execution, and audit logging
 */

import express from 'express';
import { Kafka, Consumer, Producer, logLevel } from 'kafkajs';
import Redis from 'ioredis';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { z } from 'zod';

import type {
  BattleEvent,
  Command,
  CommandResult,
  DecisionLog,
  DecisionOption,
  OperationalPlan,
  PlanPhase,
  ResourceAllocation,
  Contingency,
  LogisticsSnapshot,
  SupplyLine,
  LogisticsDepot,
  Convoy,
} from '@intelgraph/battle-types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  port: parseInt(process.env.PORT || '3013'),
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'battle-command-service',
  kafkaGroupId: process.env.KAFKA_GROUP_ID || 'battle-command-group',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  pgConnectionString:
    process.env.DATABASE_URL || 'postgresql://localhost:5432/intelgraph',
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
  COMMANDS: 'battles.commands',
  COMMAND_RESULTS: 'battles.commands.results',
  ALERTS: 'battles.alerts',
  DECISIONS: 'battles.decisions',
  LOGISTICS: 'battles.logistics',
  AUDIT: 'battles.audit',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const CommandSchema = z.object({
  targetUnitId: z.string(),
  commandType: z.string(),
  parameters: z.record(z.unknown()),
  priority: z.enum(['IMMEDIATE', 'PRIORITY', 'ROUTINE']),
});

const PlanSchema = z.object({
  name: z.string(),
  classification: z.string(),
  objective: z.string(),
  phases: z.array(
    z.object({
      name: z.string(),
      order: z.number(),
      startCondition: z.string(),
      endCondition: z.string(),
      objectives: z.array(z.string()),
      assignedUnits: z.array(z.string()),
    }),
  ),
  resources: z.array(
    z.object({
      resourceType: z.string(),
      quantity: z.number(),
      unit: z.string(),
      assignedTo: z.string(),
      priority: z.number(),
    }),
  ),
  constraints: z.array(z.string()),
  contingencies: z.array(
    z.object({
      trigger: z.string(),
      response: z.string(),
      priority: z.number(),
    }),
  ),
});

// =============================================================================
// DATA STORES
// =============================================================================

const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers,
  logLevel: logLevel.WARN,
});

let consumer: Consumer;
let producer: Producer;
let redis: Redis;
let pgPool: pg.Pool;

// In-memory stores (would be PostgreSQL in production)
const commands = new Map<string, Command>();
const plans = new Map<string, OperationalPlan>();
const decisions = new Map<string, DecisionLog>();
const logistics: LogisticsSnapshot = {
  timestamp: new Date(),
  supplyLines: [],
  depots: [],
  convoys: [],
  overallReadiness: 85,
};

// =============================================================================
// INITIALIZATION
// =============================================================================

async function initKafka(): Promise<void> {
  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: config.kafkaGroupId });

  await producer.connect();
  await consumer.connect();

  await consumer.subscribe({ topic: TOPICS.COMMANDS, fromBeginning: false });
  await consumer.subscribe({ topic: TOPICS.ALERTS, fromBeginning: false });

  logger.info('Kafka connected');
}

async function initRedis(): Promise<void> {
  redis = new Redis(config.redisUrl);
  redis.on('error', (err) => logger.error({ err }, 'Redis error'));
  logger.info('Redis connected');
}

async function initPostgres(): Promise<void> {
  pgPool = new pg.Pool({ connectionString: config.pgConnectionString });
  pgPool.on('error', (err) => logger.error({ err }, 'PostgreSQL error'));

  // Create tables if not exist
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS battle_commands (
      id UUID PRIMARY KEY,
      issued_at TIMESTAMPTZ NOT NULL,
      issued_by VARCHAR(255) NOT NULL,
      target_unit_id VARCHAR(255) NOT NULL,
      command_type VARCHAR(100) NOT NULL,
      parameters JSONB,
      priority VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      acknowledged_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      result JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS battle_plans (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      classification VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL,
      commander VARCHAR(255) NOT NULL,
      objective TEXT,
      phases JSONB,
      resources JSONB,
      constraints JSONB,
      contingencies JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS battle_decisions (
      id UUID PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL,
      decision_maker VARCHAR(255) NOT NULL,
      decision_type VARCHAR(100) NOT NULL,
      context JSONB,
      options JSONB,
      selected_option VARCHAR(255),
      rationale TEXT,
      outcome TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS battle_audit_log (
      id UUID PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL,
      actor VARCHAR(255) NOT NULL,
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(100) NOT NULL,
      resource_id VARCHAR(255),
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_battle_commands_status ON battle_commands(status);
    CREATE INDEX IF NOT EXISTS idx_battle_commands_unit ON battle_commands(target_unit_id);
    CREATE INDEX IF NOT EXISTS idx_battle_decisions_maker ON battle_decisions(decision_maker);
    CREATE INDEX IF NOT EXISTS idx_battle_audit_actor ON battle_audit_log(actor);
  `);

  logger.info('PostgreSQL connected and tables initialized');
}

// =============================================================================
// KAFKA CONSUMPTION
// =============================================================================

async function startConsumer(): Promise<void> {
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || '{}') as BattleEvent;

        if (topic === TOPICS.COMMANDS) {
          await processCommand(event);
        } else if (topic === TOPICS.ALERTS) {
          await processAlert(event);
        }
      } catch (err) {
        logger.error({ err, topic }, 'Error processing message');
      }
    },
  });

  logger.info('Kafka consumer started');
}

async function processCommand(event: BattleEvent): Promise<void> {
  const commandData = event.payload as Command;

  // Log to audit trail
  await logAudit('system', 'COMMAND_RECEIVED', 'command', commandData.id, {
    commandType: commandData.commandType,
    targetUnit: commandData.targetUnitId,
  });

  // Update command status
  if (commands.has(commandData.id)) {
    const cmd = commands.get(commandData.id)!;
    if (event.eventType === 'COMMAND_ACKNOWLEDGED') {
      cmd.status = 'ACKNOWLEDGED';
      cmd.acknowledgedAt = new Date();
    }
  }
}

async function processAlert(event: BattleEvent): Promise<void> {
  const alert = event.payload as any;

  // Log critical alerts
  await logAudit('system', 'ALERT_RECEIVED', 'alert', event.correlationId, {
    alertType: alert.alertType,
    threatLevel: alert.threatLevel,
  });

  // Cache recent alerts
  await redis.lpush('battle:alerts:recent', JSON.stringify(alert));
  await redis.ltrim('battle:alerts:recent', 0, 99);
}

// =============================================================================
// COMMAND FUNCTIONS
// =============================================================================

async function issueCommand(
  issuedBy: string,
  params: z.infer<typeof CommandSchema>,
): Promise<Command> {
  const command: Command = {
    id: uuidv4(),
    issuedAt: new Date(),
    issuedBy,
    targetUnitId: params.targetUnitId,
    commandType: params.commandType,
    parameters: params.parameters,
    priority: params.priority,
    status: 'PENDING',
  };

  // Store command
  commands.set(command.id, command);

  // Persist to PostgreSQL
  await pgPool.query(
    `INSERT INTO battle_commands
     (id, issued_at, issued_by, target_unit_id, command_type, parameters, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      command.id,
      command.issuedAt,
      command.issuedBy,
      command.targetUnitId,
      command.commandType,
      JSON.stringify(command.parameters),
      command.priority,
      command.status,
    ],
  );

  // Publish to Kafka
  await producer.send({
    topic: TOPICS.COMMANDS,
    messages: [
      {
        key: command.id,
        value: JSON.stringify({
          eventType: 'COMMAND_ISSUED',
          timestamp: new Date(),
          correlationId: command.id,
          payload: command,
          metadata: {
            sourceService: 'battle-command-service',
            version: '1.0.0',
          },
        } as BattleEvent),
      },
    ],
  });

  // Log to audit trail
  await logAudit(issuedBy, 'COMMAND_ISSUED', 'command', command.id, {
    commandType: command.commandType,
    targetUnit: command.targetUnitId,
    priority: command.priority,
  });

  logger.info(
    { commandId: command.id, type: command.commandType },
    'Command issued',
  );

  return command;
}

async function updateCommandStatus(
  commandId: string,
  status: Command['status'],
  result?: CommandResult,
): Promise<Command | null> {
  const command = commands.get(commandId);
  if (!command) return null;

  command.status = status;
  if (status === 'COMPLETED' || status === 'FAILED') {
    command.completedAt = new Date();
    command.result = result;
  }

  // Update PostgreSQL
  await pgPool.query(
    `UPDATE battle_commands
     SET status = $1, completed_at = $2, result = $3
     WHERE id = $4`,
    [status, command.completedAt, JSON.stringify(result), commandId],
  );

  // Publish result
  await producer.send({
    topic: TOPICS.COMMAND_RESULTS,
    messages: [
      {
        key: commandId,
        value: JSON.stringify({
          eventType: status === 'COMPLETED' ? 'COMMAND_COMPLETED' : 'COMMAND_FAILED',
          timestamp: new Date(),
          correlationId: commandId,
          payload: command,
          metadata: {
            sourceService: 'battle-command-service',
            version: '1.0.0',
          },
        } as BattleEvent),
      },
    ],
  });

  return command;
}

// =============================================================================
// OPERATIONAL PLANNING
// =============================================================================

async function createPlan(
  commander: string,
  params: z.infer<typeof PlanSchema>,
): Promise<OperationalPlan> {
  const plan: OperationalPlan = {
    id: uuidv4(),
    name: params.name,
    classification: params.classification,
    status: 'DRAFT',
    commander,
    createdAt: new Date(),
    objective: params.objective,
    phases: params.phases.map((p, i) => ({
      ...p,
      id: uuidv4(),
      order: p.order ?? i,
    })),
    resources: params.resources,
    constraints: params.constraints,
    contingencies: params.contingencies,
  };

  plans.set(plan.id, plan);

  // Persist to PostgreSQL
  await pgPool.query(
    `INSERT INTO battle_plans
     (id, name, classification, status, commander, objective, phases, resources, constraints, contingencies)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      plan.id,
      plan.name,
      plan.classification,
      plan.status,
      plan.commander,
      plan.objective,
      JSON.stringify(plan.phases),
      JSON.stringify(plan.resources),
      JSON.stringify(plan.constraints),
      JSON.stringify(plan.contingencies),
    ],
  );

  await logAudit(commander, 'PLAN_CREATED', 'plan', plan.id, {
    name: plan.name,
    objective: plan.objective,
  });

  logger.info({ planId: plan.id, name: plan.name }, 'Operational plan created');

  return plan;
}

async function approvePlan(planId: string, approver: string): Promise<OperationalPlan | null> {
  const plan = plans.get(planId);
  if (!plan || plan.status !== 'DRAFT') return null;

  plan.status = 'APPROVED';
  plan.approvedAt = new Date();

  await pgPool.query(
    `UPDATE battle_plans SET status = $1, approved_at = $2 WHERE id = $3`,
    [plan.status, plan.approvedAt, planId],
  );

  await logAudit(approver, 'PLAN_APPROVED', 'plan', planId, {
    name: plan.name,
  });

  logger.info({ planId, name: plan.name }, 'Plan approved');

  return plan;
}

async function activatePlan(planId: string, activator: string): Promise<OperationalPlan | null> {
  const plan = plans.get(planId);
  if (!plan || plan.status !== 'APPROVED') return null;

  plan.status = 'ACTIVE';

  await pgPool.query(`UPDATE battle_plans SET status = $1 WHERE id = $2`, [
    plan.status,
    planId,
  ]);

  await logAudit(activator, 'PLAN_ACTIVATED', 'plan', planId, {
    name: plan.name,
  });

  logger.info({ planId, name: plan.name }, 'Plan activated');

  return plan;
}

// =============================================================================
// DECISION LOGGING
// =============================================================================

async function logDecision(
  decisionMaker: string,
  decisionType: string,
  context: Record<string, unknown>,
  options: DecisionOption[],
  selectedOption: string,
  rationale: string,
): Promise<DecisionLog> {
  const decision: DecisionLog = {
    id: uuidv4(),
    timestamp: new Date(),
    decisionMaker,
    decisionType,
    context,
    options,
    selectedOption,
    rationale,
  };

  decisions.set(decision.id, decision);

  // Persist to PostgreSQL
  await pgPool.query(
    `INSERT INTO battle_decisions
     (id, timestamp, decision_maker, decision_type, context, options, selected_option, rationale)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      decision.id,
      decision.timestamp,
      decision.decisionMaker,
      decision.decisionType,
      JSON.stringify(decision.context),
      JSON.stringify(decision.options),
      decision.selectedOption,
      decision.rationale,
    ],
  );

  // Publish to Kafka
  await producer.send({
    topic: TOPICS.DECISIONS,
    messages: [
      {
        key: decision.id,
        value: JSON.stringify({
          eventType: 'DECISION_MADE',
          timestamp: new Date(),
          correlationId: decision.id,
          payload: decision,
          metadata: {
            sourceService: 'battle-command-service',
            version: '1.0.0',
          },
        } as BattleEvent),
      },
    ],
  });

  await logAudit(decisionMaker, 'DECISION_MADE', 'decision', decision.id, {
    decisionType,
    selectedOption,
  });

  logger.info(
    { decisionId: decision.id, type: decisionType },
    'Decision logged',
  );

  return decision;
}

// =============================================================================
// LOGISTICS MANAGEMENT
// =============================================================================

function updateLogistics(updates: Partial<LogisticsSnapshot>): LogisticsSnapshot {
  if (updates.supplyLines) logistics.supplyLines = updates.supplyLines;
  if (updates.depots) logistics.depots = updates.depots;
  if (updates.convoys) logistics.convoys = updates.convoys;
  if (updates.overallReadiness !== undefined)
    logistics.overallReadiness = updates.overallReadiness;
  logistics.timestamp = new Date();

  // Calculate readiness
  const depotReadiness =
    logistics.depots.length > 0
      ? logistics.depots.reduce((sum, d) => sum + d.stockLevel, 0) /
        logistics.depots.length
      : 100;

  const supplyLineHealth =
    logistics.supplyLines.length > 0
      ? (logistics.supplyLines.filter((s) => s.status === 'OPEN').length /
          logistics.supplyLines.length) *
        100
      : 100;

  logistics.overallReadiness = (depotReadiness + supplyLineHealth) / 2;

  return logistics;
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

async function logAudit(
  actor: string,
  action: string,
  resourceType: string,
  resourceId: string | undefined,
  details: Record<string, unknown>,
): Promise<void> {
  const auditEntry = {
    id: uuidv4(),
    timestamp: new Date(),
    actor,
    action,
    resourceType,
    resourceId,
    details,
  };

  // Persist to PostgreSQL
  await pgPool.query(
    `INSERT INTO battle_audit_log
     (id, timestamp, actor, action, resource_type, resource_id, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      auditEntry.id,
      auditEntry.timestamp,
      auditEntry.actor,
      auditEntry.action,
      auditEntry.resourceType,
      auditEntry.resourceId,
      JSON.stringify(auditEntry.details),
    ],
  );

  // Publish to Kafka audit topic
  await producer.send({
    topic: TOPICS.AUDIT,
    messages: [
      {
        key: auditEntry.id,
        value: JSON.stringify(auditEntry),
      },
    ],
  });
}

// =============================================================================
// EXPRESS SERVER
// =============================================================================

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'battle-command-service' });
});

// Command endpoints
app.post('/commands', async (req, res) => {
  try {
    const validated = CommandSchema.parse(req.body);
    const issuedBy = req.headers['x-user-id'] as string || 'anonymous';
    const command = await issueCommand(issuedBy, validated);
    res.status(201).json(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error({ error }, 'Failed to issue command');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/commands', (req, res) => {
  res.json(Array.from(commands.values()));
});

app.get('/commands/:id', (req, res) => {
  const command = commands.get(req.params.id);
  if (command) {
    res.json(command);
  } else {
    res.status(404).json({ error: 'Command not found' });
  }
});

app.patch('/commands/:id/status', async (req, res) => {
  const { status, result } = req.body;
  const command = await updateCommandStatus(req.params.id, status, result);
  if (command) {
    res.json(command);
  } else {
    res.status(404).json({ error: 'Command not found' });
  }
});

// Plan endpoints
app.post('/plans', async (req, res) => {
  try {
    const validated = PlanSchema.parse(req.body);
    const commander = req.headers['x-user-id'] as string || 'anonymous';
    const plan = await createPlan(commander, validated);
    res.status(201).json(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error({ error }, 'Failed to create plan');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/plans', (req, res) => {
  res.json(Array.from(plans.values()));
});

app.get('/plans/:id', (req, res) => {
  const plan = plans.get(req.params.id);
  if (plan) {
    res.json(plan);
  } else {
    res.status(404).json({ error: 'Plan not found' });
  }
});

app.post('/plans/:id/approve', async (req, res) => {
  const approver = req.headers['x-user-id'] as string || 'anonymous';
  const plan = await approvePlan(req.params.id, approver);
  if (plan) {
    res.json(plan);
  } else {
    res.status(400).json({ error: 'Plan not found or not in DRAFT status' });
  }
});

app.post('/plans/:id/activate', async (req, res) => {
  const activator = req.headers['x-user-id'] as string || 'anonymous';
  const plan = await activatePlan(req.params.id, activator);
  if (plan) {
    res.json(plan);
  } else {
    res.status(400).json({ error: 'Plan not found or not approved' });
  }
});

// Decision endpoints
app.post('/decisions', async (req, res) => {
  try {
    const { decisionType, context, options, selectedOption, rationale } = req.body;
    const decisionMaker = req.headers['x-user-id'] as string || 'anonymous';
    const decision = await logDecision(
      decisionMaker,
      decisionType,
      context,
      options,
      selectedOption,
      rationale,
    );
    res.status(201).json(decision);
  } catch (error) {
    logger.error({ error }, 'Failed to log decision');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/decisions', (req, res) => {
  res.json(Array.from(decisions.values()));
});

// Logistics endpoints
app.get('/logistics', (req, res) => {
  res.json(logistics);
});

app.patch('/logistics', (req, res) => {
  const updated = updateLogistics(req.body);
  res.json(updated);
});

// Audit log endpoint
app.get('/audit', async (req, res) => {
  const { limit = 100, offset = 0, actor, action } = req.query;

  let query = `SELECT * FROM battle_audit_log WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (actor) {
    query += ` AND actor = $${paramIndex++}`;
    params.push(actor);
  }
  if (action) {
    query += ` AND action = $${paramIndex++}`;
    params.push(action);
  }

  query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(parseInt(limit as string), parseInt(offset as string));

  const result = await pgPool.query(query, params);
  res.json(result.rows);
});

// =============================================================================
// STARTUP
// =============================================================================

async function start(): Promise<void> {
  try {
    await initKafka();
    await initRedis();
    await initPostgres();
    await startConsumer();

    // Initialize sample logistics data
    updateLogistics({
      supplyLines: [
        {
          id: 'sl-1',
          startPoint: { latitude: 38.9, longitude: -77.0 },
          endPoint: { latitude: 39.0, longitude: -76.9 },
          status: 'OPEN',
          capacity: 1000,
          currentLoad: 650,
        },
      ],
      depots: [
        {
          id: 'depot-alpha',
          name: 'Depot Alpha',
          location: { latitude: 38.95, longitude: -76.95 },
          type: 'MIXED',
          stockLevel: 78,
        },
      ],
      convoys: [],
    });

    app.listen(config.port, () => {
      logger.info({ port: config.port }, 'Battle Command Service started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start service');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await consumer?.disconnect();
  await producer?.disconnect();
  redis?.disconnect();
  await pgPool?.end();
  process.exit(0);
});

start();
