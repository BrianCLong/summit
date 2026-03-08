"use strict";
/**
 * Control Tower Service - Main Entry Point
 * @module @intelgraph/control-tower-service
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = exports.HealthScoreService = exports.SituationService = exports.EventService = void 0;
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const schema_1 = require("@graphql-tools/schema");
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = require("path");
const index_js_1 = require("./resolvers/index.js");
const EventService_js_1 = require("./services/EventService.js");
Object.defineProperty(exports, "EventService", { enumerable: true, get: function () { return EventService_js_1.EventService; } });
const SituationService_js_1 = require("./services/SituationService.js");
Object.defineProperty(exports, "SituationService", { enumerable: true, get: function () { return SituationService_js_1.SituationService; } });
const HealthScoreService_js_1 = require("./services/HealthScoreService.js");
Object.defineProperty(exports, "HealthScoreService", { enumerable: true, get: function () { return HealthScoreService_js_1.HealthScoreService; } });
const AlertService_js_1 = require("./services/AlertService.js");
Object.defineProperty(exports, "AlertService", { enumerable: true, get: function () { return AlertService_js_1.AlertService; } });
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
// Read GraphQL schema
const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'schema', 'schema.graphql'), 'utf-8');
// Create executable schema
const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers: index_js_1.resolvers });
// Mock repositories for demo - in production, these would be real implementations
const mockEventRepository = {
    findById: async (id) => null,
    findMany: async () => ({ edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false }, totalCount: 0 }),
    create: async (event) => ({ id: 'new-event', ...event, createdAt: new Date(), updatedAt: new Date() }),
    update: async (id, updates) => ({ id, ...updates }),
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
    create: async (situation) => ({ id: 'new-situation', ...situation, createdAt: new Date(), updatedAt: new Date() }),
    update: async (id, updates) => ({ id, ...updates }),
    linkEvent: async () => { },
    unlinkEvent: async () => { },
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
    saveScore: async () => { },
    getHistory: async () => [],
    getLastScore: async () => null,
};
const mockAlertRepository = {
    findAlertById: async () => null,
    findAlerts: async () => ({ edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false }, totalCount: 0 }),
    createAlert: async (alert) => ({ id: 'new-alert', ...alert }),
    updateAlert: async (id, updates) => ({ id, ...updates }),
    findRuleById: async () => null,
    findRules: async () => [],
    createRule: async (rule) => ({ id: 'new-rule', ...rule, createdAt: new Date(), updatedAt: new Date(), triggerCount: 0 }),
    updateRule: async (id, updates) => ({ id, ...updates }),
    deleteRule: async () => true,
    incrementRuleTriggerCount: async () => { },
};
const mockNotificationService = {
    send: async () => ({ delivered: true }),
};
// Create services
const eventService = new EventService_js_1.EventService(mockEventRepository, mockGraphService, mockAIService);
const situationService = new SituationService_js_1.SituationService(mockSituationRepository, mockCorrelationEngine);
const healthScoreService = new HealthScoreService_js_1.HealthScoreService(mockMetricsProvider, mockHealthScoreRepository);
const alertService = new AlertService_js_1.AlertService(mockAlertRepository, mockNotificationService);
// Start server
async function startServer() {
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    // WebSocket server for subscriptions
    const wsServer = new ws_1.WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });
    const serverCleanup = (0, ws_2.useServer)({
        schema,
        context: async () => {
            const user = {
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
            };
        },
    }, wsServer);
    // Apollo Server
    const server = new server_1.ApolloServer({
        schema,
        plugins: [
            (0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer }),
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
    app.use('/graphql', express_1.default.json(), (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => {
            // In production, extract user from JWT token
            const user = {
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
                requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
            };
        },
    }));
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
__exportStar(require("./types/index.js"), exports);
