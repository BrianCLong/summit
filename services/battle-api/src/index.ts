/**
 * Battle API - GraphQL Server
 * API gateway for multidomain data fusion and battle management
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PubSub } from 'graphql-subscriptions';
import Redis from 'ioredis';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  port: parseInt(process.env.PORT || '4001'),
  fusionServiceUrl: process.env.FUSION_SERVICE_URL || 'http://localhost:3011',
  commandServiceUrl: process.env.COMMAND_SERVICE_URL || 'http://localhost:3013',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
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
// PUBSUB FOR SUBSCRIPTIONS
// =============================================================================

const pubsub = new PubSub();

// Subscription events
const EVENTS = {
  SITUATIONAL_PICTURE_UPDATED: 'SITUATIONAL_PICTURE_UPDATED',
  ENTITY_UPDATED: 'ENTITY_UPDATED',
  ENTITY_DETECTED: 'ENTITY_DETECTED',
  THREAT_ALERT: 'THREAT_ALERT',
  COMMAND_STATUS_CHANGED: 'COMMAND_STATUS_CHANGED',
  SCENARIO_UPDATED: 'SCENARIO_UPDATED',
  FUSION_COMPLETED: 'FUSION_COMPLETED',
};

// =============================================================================
// MOCK DATA (Would be fetched from services in production)
// =============================================================================

let mockSituationalPicture = {
  timestamp: new Date(),
  areaOfInterest: {
    northWest: { latitude: 40.0, longitude: -78.0 },
    southEast: { latitude: 38.0, longitude: -76.0 },
  },
  blueForces: [
    {
      id: 'blue-1',
      name: 'Alpha Company',
      designation: '1st Battalion',
      forceType: 'BLUE',
      unitType: 'INFANTRY',
      status: 'ACTIVE',
      location: { latitude: 39.0, longitude: -77.0 },
      heading: 45,
      speed: 15,
      strength: 85,
      confidence: 0.95,
      lastUpdated: new Date(),
      sources: ['sensor-grid-alpha', 'sat-keyhole-7'],
    },
  ],
  redForces: [
    {
      id: 'red-1',
      name: 'Enemy Armor',
      forceType: 'RED',
      unitType: 'ARMOR',
      status: 'ENGAGED',
      location: { latitude: 39.1, longitude: -76.9 },
      heading: 180,
      speed: 25,
      strength: 70,
      confidence: 0.8,
      lastUpdated: new Date(),
      sources: ['sat-keyhole-7'],
    },
  ],
  neutralForces: [],
  unknownContacts: [],
  threats: [
    {
      id: 'threat-1',
      entityId: 'red-1',
      threatLevel: 'HIGH',
      threatType: 'ARMOR',
      capabilities: ['Breakthrough', 'Direct fire support'],
      intent: 'OFFENSIVE',
      confidence: 0.8,
    },
  ],
  logisticsStatus: {
    timestamp: new Date(),
    supplyLines: [],
    depots: [],
    convoys: [],
    overallReadiness: 85,
  },
};

const mockCommands = new Map();
const mockPlans = new Map();
const mockScenarios = new Map();
const mockDecisions = new Map();
const mockDataSources = new Map([
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
]);

// =============================================================================
// RESOLVERS
// =============================================================================

const resolvers = {
  Query: {
    situationalPicture: () => mockSituationalPicture,

    fusedEntities: (_: any, args: { forceType?: string; unitType?: string }) => {
      let entities = [
        ...mockSituationalPicture.blueForces,
        ...mockSituationalPicture.redForces,
        ...mockSituationalPicture.neutralForces,
        ...mockSituationalPicture.unknownContacts,
      ];

      if (args.forceType) {
        entities = entities.filter((e) => e.forceType === args.forceType);
      }
      if (args.unitType) {
        entities = entities.filter((e) => e.unitType === args.unitType);
      }

      return entities.map((e) => ({
        id: `fused-${e.id}`,
        canonicalId: e.id,
        entity: e,
        fusionScore: e.confidence,
        contributingSources: e.sources.map((s: string) => ({
          sourceId: s,
          domain: mockDataSources.get(s)?.domain || 'EXTERNAL',
          weight: 0.5,
          confidence: e.confidence,
          timestamp: e.lastUpdated,
        })),
        lastFused: new Date(),
      }));
    },

    entity: (_: any, args: { id: string }) => {
      const allEntities = [
        ...mockSituationalPicture.blueForces,
        ...mockSituationalPicture.redForces,
      ];
      const entity = allEntities.find((e) => e.id === args.id);
      if (!entity) return null;

      return {
        id: `fused-${entity.id}`,
        canonicalId: entity.id,
        entity,
        fusionScore: entity.confidence,
        contributingSources: [],
        lastFused: new Date(),
      };
    },

    threats: (_: any, args: { minLevel?: string }) => {
      let threats = mockSituationalPicture.threats;
      if (args.minLevel) {
        const levels = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const minIndex = levels.indexOf(args.minLevel);
        threats = threats.filter(
          (t) => levels.indexOf(t.threatLevel) >= minIndex,
        );
      }
      return threats;
    },

    commands: (_: any, args: { status?: string }) => {
      let cmds = Array.from(mockCommands.values());
      if (args.status) {
        cmds = cmds.filter((c: any) => c.status === args.status);
      }
      return cmds;
    },

    command: (_: any, args: { id: string }) => mockCommands.get(args.id),

    operationalPlans: (_: any, args: { status?: string }) => {
      let plans = Array.from(mockPlans.values());
      if (args.status) {
        plans = plans.filter((p: any) => p.status === args.status);
      }
      return plans;
    },

    operationalPlan: (_: any, args: { id: string }) => mockPlans.get(args.id),

    scenarios: (_: any, args: { status?: string }) => {
      let scenarios = Array.from(mockScenarios.values());
      if (args.status) {
        scenarios = scenarios.filter((s: any) => s.status === args.status);
      }
      return scenarios;
    },

    scenario: (_: any, args: { id: string }) => mockScenarios.get(args.id),

    logistics: () => mockSituationalPicture.logisticsStatus,

    supplyLines: (_: any, args: { status?: string }) => {
      let lines = mockSituationalPicture.logisticsStatus.supplyLines;
      if (args.status) {
        lines = lines.filter((l) => l.status === args.status);
      }
      return lines;
    },

    depots: () => mockSituationalPicture.logisticsStatus.depots,

    convoys: () => mockSituationalPicture.logisticsStatus.convoys,

    decisions: (_: any, args: { decisionMaker?: string }) => {
      let decisions = Array.from(mockDecisions.values());
      if (args.decisionMaker) {
        decisions = decisions.filter(
          (d: any) => d.decisionMaker === args.decisionMaker,
        );
      }
      return decisions;
    },

    decision: (_: any, args: { id: string }) => mockDecisions.get(args.id),

    dataSources: (_: any, args: { domain?: string }) => {
      let sources = Array.from(mockDataSources.values());
      if (args.domain) {
        sources = sources.filter((s: any) => s.domain === args.domain);
      }
      return sources;
    },

    dataSource: (_: any, args: { id: string }) => mockDataSources.get(args.id),

    fusionMetrics: () => ({
      entityCount:
        mockSituationalPicture.blueForces.length +
        mockSituationalPicture.redForces.length,
      activeScenarios: Array.from(mockScenarios.values()).filter(
        (s: any) => s.status === 'ACTIVE',
      ).length,
      domainCoverage: [
        { domain: 'SENSOR_GRID', sourceCount: 1, lastUpdate: new Date() },
        { domain: 'SATELLITE', sourceCount: 1, lastUpdate: new Date() },
      ],
      averageConfidence: 0.85,
      lastFusionTime: new Date(),
    }),
  },

  Mutation: {
    issueCommand: (_: any, args: { input: any }) => {
      const command = {
        id: `cmd-${Date.now()}`,
        issuedAt: new Date(),
        issuedBy: 'commander',
        ...args.input,
        status: 'PENDING',
      };
      mockCommands.set(command.id, command);
      pubsub.publish(EVENTS.COMMAND_STATUS_CHANGED, {
        commandStatusChanged: command,
      });
      return command;
    },

    acknowledgeCommand: (_: any, args: { id: string }) => {
      const command = mockCommands.get(args.id);
      if (command) {
        command.status = 'ACKNOWLEDGED';
        command.acknowledgedAt = new Date();
        pubsub.publish(EVENTS.COMMAND_STATUS_CHANGED, {
          commandStatusChanged: command,
        });
      }
      return command;
    },

    completeCommand: (
      _: any,
      args: { id: string; success: boolean; message?: string },
    ) => {
      const command = mockCommands.get(args.id);
      if (command) {
        command.status = args.success ? 'COMPLETED' : 'FAILED';
        command.completedAt = new Date();
        command.result = { success: args.success, message: args.message };
        pubsub.publish(EVENTS.COMMAND_STATUS_CHANGED, {
          commandStatusChanged: command,
        });
      }
      return command;
    },

    createPlan: (_: any, args: { input: any }) => {
      const plan = {
        id: `plan-${Date.now()}`,
        createdAt: new Date(),
        commander: 'commander',
        status: 'DRAFT',
        ...args.input,
        phases: args.input.phases.map((p: any, i: number) => ({
          ...p,
          id: `phase-${i}`,
        })),
      };
      mockPlans.set(plan.id, plan);
      return plan;
    },

    approvePlan: (_: any, args: { id: string }) => {
      const plan = mockPlans.get(args.id);
      if (plan) {
        plan.status = 'APPROVED';
        plan.approvedAt = new Date();
      }
      return plan;
    },

    activatePlan: (_: any, args: { id: string }) => {
      const plan = mockPlans.get(args.id);
      if (plan) {
        plan.status = 'ACTIVE';
      }
      return plan;
    },

    cancelPlan: (_: any, args: { id: string }) => {
      const plan = mockPlans.get(args.id);
      if (plan) {
        plan.status = 'CANCELLED';
      }
      return plan;
    },

    createScenario: (_: any, args: { input: any }) => {
      const scenario = {
        id: `scenario-${Date.now()}`,
        createdAt: new Date(),
        createdBy: 'planner',
        status: 'DRAFT',
        startTime: new Date(),
        currentTime: new Date(),
        events: [],
        outcomes: [],
        ...args.input,
      };
      mockScenarios.set(scenario.id, scenario);
      return scenario;
    },

    addScenarioEvent: (_: any, args: { scenarioId: string; input: any }) => {
      const scenario = mockScenarios.get(args.scenarioId);
      if (!scenario) return null;

      const event = {
        id: `event-${Date.now()}`,
        executed: false,
        ...args.input,
      };
      scenario.events.push(event);
      return event;
    },

    startScenario: (_: any, args: { id: string }) => {
      const scenario = mockScenarios.get(args.id);
      if (scenario) {
        scenario.status = 'ACTIVE';
        scenario.startTime = new Date();
        pubsub.publish(EVENTS.SCENARIO_UPDATED, { scenarioUpdated: scenario });
      }
      return scenario;
    },

    pauseScenario: (_: any, args: { id: string }) => {
      const scenario = mockScenarios.get(args.id);
      if (scenario) {
        scenario.status = 'PAUSED';
        pubsub.publish(EVENTS.SCENARIO_UPDATED, { scenarioUpdated: scenario });
      }
      return scenario;
    },

    completeScenario: (_: any, args: { id: string }) => {
      const scenario = mockScenarios.get(args.id);
      if (scenario) {
        scenario.status = 'COMPLETED';
        pubsub.publish(EVENTS.SCENARIO_UPDATED, { scenarioUpdated: scenario });
      }
      return scenario;
    },

    logDecision: (_: any, args: { input: any }) => {
      const decision = {
        id: `decision-${Date.now()}`,
        timestamp: new Date(),
        decisionMaker: 'commander',
        ...args.input,
      };
      mockDecisions.set(decision.id, decision);
      return decision;
    },

    updateDecisionOutcome: (_: any, args: { id: string; outcome: string }) => {
      const decision = mockDecisions.get(args.id);
      if (decision) {
        decision.outcome = args.outcome;
      }
      return decision;
    },

    registerDataSource: (_: any, args: { input: any }) => {
      const source = {
        ...args.input,
        lastContact: new Date(),
      };
      mockDataSources.set(source.id, source);
      return source;
    },

    updateSupplyLine: (_: any, args: { id: string; status: string }) => {
      const line = mockSituationalPicture.logisticsStatus.supplyLines.find(
        (l) => l.id === args.id,
      );
      if (line) {
        line.status = args.status as any;
      }
      return line;
    },

    updateDepotStock: (_: any, args: { id: string; stockLevel: number }) => {
      const depot = mockSituationalPicture.logisticsStatus.depots.find(
        (d) => d.id === args.id,
      );
      if (depot) {
        depot.stockLevel = args.stockLevel;
      }
      return depot;
    },

    dispatchConvoy: (
      _: any,
      args: { depotId: string; destination: string; cargo: string[] },
    ) => {
      const convoy = {
        id: `convoy-${Date.now()}`,
        origin: args.depotId,
        destination: args.destination,
        currentLocation: { latitude: 39.0, longitude: -77.0 },
        eta: new Date(Date.now() + 3600000),
        cargo: args.cargo,
        escortStrength: 80,
        status: 'ACTIVE',
      };
      mockSituationalPicture.logisticsStatus.convoys.push(convoy as any);
      return convoy;
    },

    updateSourceStatus: (
      _: any,
      args: { id: string; reliability?: string; credibility?: number },
    ) => {
      const source = mockDataSources.get(args.id);
      if (source) {
        if (args.reliability) source.reliability = args.reliability;
        if (args.credibility) source.credibility = args.credibility;
        source.lastContact = new Date();
      }
      return source;
    },
  },

  Subscription: {
    situationalPictureUpdated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.SITUATIONAL_PICTURE_UPDATED]),
    },
    entityUpdated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.ENTITY_UPDATED]),
    },
    entityDetected: {
      subscribe: () => pubsub.asyncIterator([EVENTS.ENTITY_DETECTED]),
    },
    threatAlert: {
      subscribe: () => pubsub.asyncIterator([EVENTS.THREAT_ALERT]),
    },
    commandStatusChanged: {
      subscribe: () => pubsub.asyncIterator([EVENTS.COMMAND_STATUS_CHANGED]),
    },
    scenarioUpdated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.SCENARIO_UPDATED]),
    },
    fusionCompleted: {
      subscribe: () => pubsub.asyncIterator([EVENTS.FUSION_COMPLETED]),
    },
    criticalAlert: {
      subscribe: () => pubsub.asyncIterator([EVENTS.THREAT_ALERT]),
    },
    entityLost: {
      subscribe: () => pubsub.asyncIterator([EVENTS.ENTITY_UPDATED]),
    },
    scenarioEventExecuted: {
      subscribe: () => pubsub.asyncIterator([EVENTS.SCENARIO_UPDATED]),
    },
  },

  // Scalar resolvers
  DateTime: {
    serialize: (value: Date) => value.toISOString(),
    parseValue: (value: string) => new Date(value),
    parseLiteral: (ast: any) => new Date(ast.value),
  },
};

// =============================================================================
// SERVER SETUP
// =============================================================================

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // Load schema
  const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

  // Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: req.headers['x-user-id'] || 'anonymous',
      }),
    }),
  );

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'battle-api' });
  });

  httpServer.listen(config.port, () => {
    logger.info(
      { port: config.port },
      `Battle API running at http://localhost:${config.port}/graphql`,
    );
  });

  // Simulate periodic updates
  setInterval(() => {
    mockSituationalPicture.timestamp = new Date();
    pubsub.publish(EVENTS.SITUATIONAL_PICTURE_UPDATED, {
      situationalPictureUpdated: mockSituationalPicture,
    });
  }, 5000);
}

startServer().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
