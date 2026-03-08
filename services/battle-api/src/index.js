"use strict";
/**
 * Battle API - GraphQL Server
 * API gateway for multidomain data fusion and battle management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const schema_1 = require("@graphql-tools/schema");
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = require("path");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const pino_1 = __importDefault(require("pino"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
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
const logger = (0, pino_1.default)({
    level: config.logLevel,
    transport: {
        target: 'pino-pretty',
        options: { colorize: true },
    },
});
// =============================================================================
// PUBSUB FOR SUBSCRIPTIONS
// =============================================================================
const pubsub = new graphql_subscriptions_1.PubSub();
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
        fusedEntities: (_, args) => {
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
                contributingSources: e.sources.map((s) => ({
                    sourceId: s,
                    domain: mockDataSources.get(s)?.domain || 'EXTERNAL',
                    weight: 0.5,
                    confidence: e.confidence,
                    timestamp: e.lastUpdated,
                })),
                lastFused: new Date(),
            }));
        },
        entity: (_, args) => {
            const allEntities = [
                ...mockSituationalPicture.blueForces,
                ...mockSituationalPicture.redForces,
            ];
            const entity = allEntities.find((e) => e.id === args.id);
            if (!entity)
                return null;
            return {
                id: `fused-${entity.id}`,
                canonicalId: entity.id,
                entity,
                fusionScore: entity.confidence,
                contributingSources: [],
                lastFused: new Date(),
            };
        },
        threats: (_, args) => {
            let threats = mockSituationalPicture.threats;
            if (args.minLevel) {
                const levels = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
                const minIndex = levels.indexOf(args.minLevel);
                threats = threats.filter((t) => levels.indexOf(t.threatLevel) >= minIndex);
            }
            return threats;
        },
        commands: (_, args) => {
            let cmds = Array.from(mockCommands.values());
            if (args.status) {
                cmds = cmds.filter((c) => c.status === args.status);
            }
            return cmds;
        },
        command: (_, args) => mockCommands.get(args.id),
        operationalPlans: (_, args) => {
            let plans = Array.from(mockPlans.values());
            if (args.status) {
                plans = plans.filter((p) => p.status === args.status);
            }
            return plans;
        },
        operationalPlan: (_, args) => mockPlans.get(args.id),
        scenarios: (_, args) => {
            let scenarios = Array.from(mockScenarios.values());
            if (args.status) {
                scenarios = scenarios.filter((s) => s.status === args.status);
            }
            return scenarios;
        },
        scenario: (_, args) => mockScenarios.get(args.id),
        logistics: () => mockSituationalPicture.logisticsStatus,
        supplyLines: (_, args) => {
            let lines = mockSituationalPicture.logisticsStatus.supplyLines;
            if (args.status) {
                lines = lines.filter((l) => l.status === args.status);
            }
            return lines;
        },
        depots: () => mockSituationalPicture.logisticsStatus.depots,
        convoys: () => mockSituationalPicture.logisticsStatus.convoys,
        decisions: (_, args) => {
            let decisions = Array.from(mockDecisions.values());
            if (args.decisionMaker) {
                decisions = decisions.filter((d) => d.decisionMaker === args.decisionMaker);
            }
            return decisions;
        },
        decision: (_, args) => mockDecisions.get(args.id),
        dataSources: (_, args) => {
            let sources = Array.from(mockDataSources.values());
            if (args.domain) {
                sources = sources.filter((s) => s.domain === args.domain);
            }
            return sources;
        },
        dataSource: (_, args) => mockDataSources.get(args.id),
        fusionMetrics: () => ({
            entityCount: mockSituationalPicture.blueForces.length +
                mockSituationalPicture.redForces.length,
            activeScenarios: Array.from(mockScenarios.values()).filter((s) => s.status === 'ACTIVE').length,
            domainCoverage: [
                { domain: 'SENSOR_GRID', sourceCount: 1, lastUpdate: new Date() },
                { domain: 'SATELLITE', sourceCount: 1, lastUpdate: new Date() },
            ],
            averageConfidence: 0.85,
            lastFusionTime: new Date(),
        }),
    },
    Mutation: {
        issueCommand: (_, args) => {
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
        acknowledgeCommand: (_, args) => {
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
        completeCommand: (_, args) => {
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
        createPlan: (_, args) => {
            const plan = {
                id: `plan-${Date.now()}`,
                createdAt: new Date(),
                commander: 'commander',
                status: 'DRAFT',
                ...args.input,
                phases: args.input.phases.map((p, i) => ({
                    ...p,
                    id: `phase-${i}`,
                })),
            };
            mockPlans.set(plan.id, plan);
            return plan;
        },
        approvePlan: (_, args) => {
            const plan = mockPlans.get(args.id);
            if (plan) {
                plan.status = 'APPROVED';
                plan.approvedAt = new Date();
            }
            return plan;
        },
        activatePlan: (_, args) => {
            const plan = mockPlans.get(args.id);
            if (plan) {
                plan.status = 'ACTIVE';
            }
            return plan;
        },
        cancelPlan: (_, args) => {
            const plan = mockPlans.get(args.id);
            if (plan) {
                plan.status = 'CANCELLED';
            }
            return plan;
        },
        createScenario: (_, args) => {
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
        addScenarioEvent: (_, args) => {
            const scenario = mockScenarios.get(args.scenarioId);
            if (!scenario)
                return null;
            const event = {
                id: `event-${Date.now()}`,
                executed: false,
                ...args.input,
            };
            scenario.events.push(event);
            return event;
        },
        startScenario: (_, args) => {
            const scenario = mockScenarios.get(args.id);
            if (scenario) {
                scenario.status = 'ACTIVE';
                scenario.startTime = new Date();
                pubsub.publish(EVENTS.SCENARIO_UPDATED, { scenarioUpdated: scenario });
            }
            return scenario;
        },
        pauseScenario: (_, args) => {
            const scenario = mockScenarios.get(args.id);
            if (scenario) {
                scenario.status = 'PAUSED';
                pubsub.publish(EVENTS.SCENARIO_UPDATED, { scenarioUpdated: scenario });
            }
            return scenario;
        },
        completeScenario: (_, args) => {
            const scenario = mockScenarios.get(args.id);
            if (scenario) {
                scenario.status = 'COMPLETED';
                pubsub.publish(EVENTS.SCENARIO_UPDATED, { scenarioUpdated: scenario });
            }
            return scenario;
        },
        logDecision: (_, args) => {
            const decision = {
                id: `decision-${Date.now()}`,
                timestamp: new Date(),
                decisionMaker: 'commander',
                ...args.input,
            };
            mockDecisions.set(decision.id, decision);
            return decision;
        },
        updateDecisionOutcome: (_, args) => {
            const decision = mockDecisions.get(args.id);
            if (decision) {
                decision.outcome = args.outcome;
            }
            return decision;
        },
        registerDataSource: (_, args) => {
            const source = {
                ...args.input,
                lastContact: new Date(),
            };
            mockDataSources.set(source.id, source);
            return source;
        },
        updateSupplyLine: (_, args) => {
            const line = mockSituationalPicture.logisticsStatus.supplyLines.find((l) => l.id === args.id);
            if (line) {
                line.status = args.status;
            }
            return line;
        },
        updateDepotStock: (_, args) => {
            const depot = mockSituationalPicture.logisticsStatus.depots.find((d) => d.id === args.id);
            if (depot) {
                depot.stockLevel = args.stockLevel;
            }
            return depot;
        },
        dispatchConvoy: (_, args) => {
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
            mockSituationalPicture.logisticsStatus.convoys.push(convoy);
            return convoy;
        },
        updateSourceStatus: (_, args) => {
            const source = mockDataSources.get(args.id);
            if (source) {
                if (args.reliability)
                    source.reliability = args.reliability;
                if (args.credibility)
                    source.credibility = args.credibility;
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
        serialize: (value) => value.toISOString(),
        parseValue: (value) => new Date(value),
        parseLiteral: (ast) => new Date(ast.value),
    },
};
// =============================================================================
// SERVER SETUP
// =============================================================================
async function startServer() {
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    // Load schema
    const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'schema.graphql'), 'utf-8');
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
    // WebSocket server for subscriptions
    const wsServer = new ws_1.WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });
    const serverCleanup = (0, ws_2.useServer)({ schema }, wsServer);
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
    app.use('/graphql', (0, cors_1.default)(), express_1.default.json(), (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => ({
            user: req.headers['x-user-id'] || 'anonymous',
        }),
    }));
    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'healthy', service: 'battle-api' });
    });
    httpServer.listen(config.port, () => {
        logger.info({ port: config.port }, `Battle API running at http://localhost:${config.port}/graphql`);
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
