"use strict";
/**
 * Recursive Outcome Amplifier™ Service
 * Entry point and exports
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = exports.outcomeResolvers = exports.LeverageIdentifier = exports.CascadeSimulator = exports.DampingCalculator = exports.createDefaultContext = exports.PropagationEngine = exports.estimateInterventionCost = exports.determineInterventionType = exports.InterventionType = exports.LeveragePointBuilder = exports.buildCascadeDAG = exports.CascadeMapBuilder = exports.createRootNode = exports.OutcomeNodeBuilder = exports.OutcomeAmplifier = void 0;
exports.loadSchema = loadSchema;
exports.createServer = createServer;
exports.startService = startService;
const server_1 = require("@apollo/server");
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = require("path");
const OutcomeAmplifier_js_1 = require("./OutcomeAmplifier.js");
const outcomeResolvers_js_1 = require("./resolvers/outcomeResolvers.js");
const pino_1 = __importDefault(require("pino"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
const logger = (0, pino_1.default)({ name: 'RecursiveOutcomeAmplifier' });
/**
 * Load GraphQL schema
 */
function loadSchema() {
    const schemaPath = (0, path_1.join)(__dirname, '../schema.graphql');
    return (0, fs_1.readFileSync)(schemaPath, 'utf-8');
}
/**
 * Create Apollo Server instance
 */
async function createServer(amplifier) {
    const typeDefs = loadSchema();
    const server = new server_1.ApolloServer({
        typeDefs,
        resolvers: outcomeResolvers_js_1.outcomeResolvers,
    });
    return server;
}
/**
 * Start the service
 */
async function startService(port = 4002) {
    try {
        // Create amplifier instance
        const amplifier = new OutcomeAmplifier_js_1.OutcomeAmplifier({
            defaultMaxOrder: 5,
            defaultProbabilityThreshold: 0.1,
            defaultMagnitudeThreshold: 0.1,
            enableCaching: true,
        });
        // Create Apollo Server
        const server = await createServer(amplifier);
        // Start server
        await server.start();
        logger.info({ port }, 'Recursive Outcome Amplifier service started');
        // Note: In a real deployment, you'd use express or similar to handle HTTP
        // This is just the Apollo Server setup
    }
    catch (error) {
        logger.error({ error }, 'Failed to start service');
        throw error;
    }
}
// Export main classes and types
var OutcomeAmplifier_js_2 = require("./OutcomeAmplifier.js");
Object.defineProperty(exports, "OutcomeAmplifier", { enumerable: true, get: function () { return OutcomeAmplifier_js_2.OutcomeAmplifier; } });
var OutcomeNode_js_1 = require("./models/OutcomeNode.js");
Object.defineProperty(exports, "OutcomeNodeBuilder", { enumerable: true, get: function () { return OutcomeNode_js_1.OutcomeNodeBuilder; } });
Object.defineProperty(exports, "createRootNode", { enumerable: true, get: function () { return OutcomeNode_js_1.createRootNode; } });
var CascadeMap_js_1 = require("./models/CascadeMap.js");
Object.defineProperty(exports, "CascadeMapBuilder", { enumerable: true, get: function () { return CascadeMap_js_1.CascadeMapBuilder; } });
Object.defineProperty(exports, "buildCascadeDAG", { enumerable: true, get: function () { return CascadeMap_js_1.buildCascadeDAG; } });
var LeveragePoint_js_1 = require("./models/LeveragePoint.js");
Object.defineProperty(exports, "LeveragePointBuilder", { enumerable: true, get: function () { return LeveragePoint_js_1.LeveragePointBuilder; } });
Object.defineProperty(exports, "InterventionType", { enumerable: true, get: function () { return LeveragePoint_js_1.InterventionType; } });
Object.defineProperty(exports, "determineInterventionType", { enumerable: true, get: function () { return LeveragePoint_js_1.determineInterventionType; } });
Object.defineProperty(exports, "estimateInterventionCost", { enumerable: true, get: function () { return LeveragePoint_js_1.estimateInterventionCost; } });
var PropagationEngine_js_1 = require("./algorithms/PropagationEngine.js");
Object.defineProperty(exports, "PropagationEngine", { enumerable: true, get: function () { return PropagationEngine_js_1.PropagationEngine; } });
Object.defineProperty(exports, "createDefaultContext", { enumerable: true, get: function () { return PropagationEngine_js_1.createDefaultContext; } });
var DampingCalculator_js_1 = require("./algorithms/DampingCalculator.js");
Object.defineProperty(exports, "DampingCalculator", { enumerable: true, get: function () { return DampingCalculator_js_1.DampingCalculator; } });
var CascadeSimulator_js_1 = require("./algorithms/CascadeSimulator.js");
Object.defineProperty(exports, "CascadeSimulator", { enumerable: true, get: function () { return CascadeSimulator_js_1.CascadeSimulator; } });
var LeverageIdentifier_js_1 = require("./algorithms/LeverageIdentifier.js");
Object.defineProperty(exports, "LeverageIdentifier", { enumerable: true, get: function () { return LeverageIdentifier_js_1.LeverageIdentifier; } });
var outcomeResolvers_js_2 = require("./resolvers/outcomeResolvers.js");
Object.defineProperty(exports, "outcomeResolvers", { enumerable: true, get: function () { return outcomeResolvers_js_2.outcomeResolvers; } });
Object.defineProperty(exports, "createContext", { enumerable: true, get: function () { return outcomeResolvers_js_2.createContext; } });
// If running directly, start the service
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4002;
    startService(port).catch((error) => {
        logger.error({ error }, 'Service startup failed');
        process.exit(1);
    });
}
