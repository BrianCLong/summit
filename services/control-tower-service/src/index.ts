/**
 * Control Tower Service - Main Entry Point
 * @module @intelgraph/control-tower-service
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import express from 'express';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { resolvers, type ResolverContext } from './resolvers/index.js';
import { EventService } from './services/EventService.js';
import { SituationService } from './services/SituationService.js';
import { HealthScoreService } from './services/HealthScoreService.js';
import { AlertService } from './services/AlertService.js';
import type { User } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read GraphQL schema
const typeDefs = readFileSync(join(__dirname, 'schema', 'schema.graphql'), 'utf-8');

// Create executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Mock repositories for demo - in production, these would be real implementations
const mockEventRepository = {
  findById: async (id: string) => null,
  findMany: async () => ({ edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false }, totalCount: 0 }),
  create: async (event: any) => ({ id: 'new-event', ...event, createdAt: new Date(), updatedAt: new Date() }),
  update: async (id: string, updates: any) => ({ id, ...updates }),
  findCorrelated: async () => [],
  count: async () => 0,
};

const mockGraphService = {
  getRelatedEntities: async () => [],
  getContextGraph: async () => ({ nodes: [], edges: [] }),
};

const mockAIService = {
  getSuggestions: async () => [],
};

const mockSituationRepository = {
  findById: async () => null,
  findActive: async () => ({ edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false }, totalCount: 0 }),
  create: async (situation: any) => ({ id: 'new-situation', ...situation, createdAt: new Date(), updatedAt: new Date() }),
  update: async (id: string, updates: any) => ({ id, ...updates }),
  linkEvent: async () => {},
  unlinkEvent: async () => {},
  getEvents: async () => [],
  count: async () => 0,
};

const mockCorrelationEngine = {
  suggestCorrelations: async () => [],
  calculateImpact: async () => ({ affectedCustomers: [] }),
  getRecommendedActions: async () => [],
};

const mockMetricsProvider = {
  getSupportMetrics: async () => ({ openTickets: 127, avgResponseTime: 1.5, csat: 94.2 }),
  getRevenueMetrics: async () => ({ mrrAtRisk: 45200, churnRate: 1.2, nps: 67 }),
  getProductMetrics: async () => ({ errorRate: 0.1, latency: 450, uptime: 99.95 }),
  getTeamMetrics: async () => ({ utilization: 78, burnout: 22, sentiment: 82 }),
};

const mockHealthScoreRepository = {
  saveScore: async () => {},
  getHistory: async () => [],
  getLastScore: async () => null,
};

const mockAlertRepository = {
  findAlertById: async () => null,
  findAlerts: async () => ({ edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false }, totalCount: 0 }),
  createAlert: async (alert: any) => ({ id: 'new-alert', ...alert }),
  updateAlert: async (id: string, updates: any) => ({ id, ...updates }),
  findRuleById: async () => null,
  findRules: async () => [],
  createRule: async (rule: any) => ({ id: 'new-rule', ...rule, createdAt: new Date(), updatedAt: new Date(), triggerCount: 0 }),
  updateRule: async (id: string, updates: any) => ({ id, ...updates }),
  deleteRule: async () => true,
  incrementRuleTriggerCount: async () => {},
};

const mockNotificationService = {
  send: async () => ({ delivered: true }),
};

// Create services
const eventService = new EventService(mockEventRepository as any, mockGraphService, mockAIService);
const situationService = new SituationService(mockSituationRepository as any, mockCorrelationEngine);
const healthScoreService = new HealthScoreService(mockMetricsProvider, mockHealthScoreRepository);
const alertService = new AlertService(mockAlertRepository as any, mockNotificationService);

// Start server
async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer(
    {
      schema,
      context: async () => {
        const user: User = {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
        };

        return {
          eventService,
          situationService,
          healthScoreService,
          alertService,
          user,
          tenantId: 'demo-tenant',
          requestId: `req-${Date.now()}`,
        } satisfies ResolverContext;
      },
    },
    wsServer,
  );

  // Apollo Server
  const server = new ApolloServer<ResolverContext>({
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
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // In production, extract user from JWT token
        const user: User = {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
        };

        return {
          eventService,
          situationService,
          healthScoreService,
          alertService,
          user,
          tenantId: 'demo-tenant',
          requestId: req.headers['x-request-id'] as string || `req-${Date.now()}`,
        };
      },
    }),
  );

  // Health check endpoint
  app.get('/health', (_, res) => {
    res.json({ status: 'healthy', service: 'control-tower-service', timestamp: new Date().toISOString() });
  });

  const PORT = process.env.PORT || 4010;

  httpServer.listen(PORT, () => {
    console.log(`🎯 Control Tower Service running at http://localhost:${PORT}/graphql`);
    console.log(`📡 Subscriptions available at ws://localhost:${PORT}/graphql`);
  });
}

startServer().catch(console.error);

export { EventService, SituationService, HealthScoreService, AlertService };
export * from './types/index.js';
