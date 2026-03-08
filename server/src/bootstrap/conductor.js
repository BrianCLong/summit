"use strict";
// Conductor Bootstrap Module
// Integrates the Conductor (MoE+MCP) system with Apollo Server and Express
// Author: IntelGraph Platform Engineering
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wireConductor = wireConductor;
exports.validateConductorEnvironment = validateConductorEnvironment;
const server_1 = require("@apollo/server");
const express_1 = __importDefault(require("express"));
// import { expressMiddleware } from '@as-integrations/express4';
const cors_1 = __importDefault(require("cors"));
const index_js_1 = require("../graphql/schema/index.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const config_js_1 = require("../conductor/config.js");
const index_js_2 = require("../conductor/observability/index.js");
const conductorLogger = logger_js_1.default.child({ name: 'conductor-bootstrap' });
/**
 * Wire the Conductor system into the main application
 * This function should be called during server startup after Apollo initialization
 */
async function wireConductor(options) {
    // Only initialize if explicitly enabled
    if (process.env.CONDUCTOR_ENABLED !== 'true') {
        conductorLogger.info('Conductor disabled by CONDUCTOR_ENABLED env var');
        return null;
    }
    conductorLogger.info('Wiring Conductor (MoE+MCP) system...');
    try {
        // Validate required environment variables
        const requiredEnvVars = [
            'NEO4J_URI',
            process.env.NEO4J_USER ? 'NEO4J_USER' : 'NEO4J_USERNAME',
            'NEO4J_PASSWORD',
        ];
        const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        // Initialize the conductor system with MCP servers
        const servers = await (0, config_js_1.initializeConductorSystem)();
        // Add Apollo Server plugin for OTEL tracing and context propagation
        if (options.apollo) {
            options.apollo.addPlugin((0, index_js_2.createConductorGraphQLPlugin)());
            conductorLogger.info('Added Conductor Apollo plugin for observability');
        }
        // Add GraphQL endpoint for Conductor
        if (options.app) {
            const apollo = new server_1.ApolloServer({ typeDefs: index_js_1.typeDefs, introspection: true });
            await apollo.start();
            options.app.use('/graphql', (0, cors_1.default)(), express_1.default.json());
            conductorLogger.info('[conductor] GraphQL mounted at /graphql');
        }
        // Add Express middleware for conductor health checks if needed
        if (options.app) {
            options.app.get('/health/conductor', async (req, res) => {
                try {
                    const { getConductorHealth } = await Promise.resolve().then(() => __importStar(require('../conductor/metrics.js')));
                    const health = await getConductorHealth();
                    const statusCode = health.status === 'healthy'
                        ? 200
                        : health.status === 'degraded'
                            ? 200
                            : 503;
                    res.status(statusCode).json(health);
                }
                catch (error) {
                    conductorLogger.error('Health check failed:', error);
                    res.status(503).json({
                        status: 'fail',
                        message: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            });
        }
        const result = {
            ...servers,
            shutdown: async () => {
                conductorLogger.info('Shutting down Conductor system...');
                await (0, config_js_1.shutdownConductorSystem)(servers);
                conductorLogger.info('Conductor shutdown complete');
            },
        };
        conductorLogger.info('Conductor system wired successfully', {
            graphOpsEnabled: !!servers.graphOpsServer,
            filesEnabled: !!servers.filesServer,
            experts: process.env.CONDUCTOR_EXPERTS?.split(',') || ['ALL'],
        });
        return result;
    }
    catch (error) {
        conductorLogger.error('Failed to wire Conductor system:', error);
        // Don't fail the entire server startup - allow graceful degradation
        if (process.env.CONDUCTOR_REQUIRED === 'true') {
            throw error;
        }
        else {
            conductorLogger.warn('Continuing without Conductor (graceful degradation)');
            return null;
        }
    }
}
/**
 * Environment validation helper
 */
function validateConductorEnvironment() {
    const errors = [];
    const warnings = [];
    // Required for basic operation
    const required = [
        'NEO4J_URI',
        process.env.NEO4J_USER ? 'NEO4J_USER' : 'NEO4J_USERNAME',
        'NEO4J_PASSWORD',
    ];
    // Optional but recommended
    const recommended = [
        'LLM_LIGHT_API_KEY',
        'LLM_HEAVY_API_KEY',
        'MCP_AUTH_TOKEN',
        'CONDUCTOR_TIMEOUT_MS',
    ];
    // Check required
    required.forEach((envVar) => {
        if (!process.env[envVar]) {
            errors.push(`Missing required environment variable: ${envVar}`);
        }
    });
    // Check recommended
    recommended.forEach((envVar) => {
        if (!process.env[envVar]) {
            warnings.push(`Missing recommended environment variable: ${envVar}`);
        }
    });
    // Validate numeric values
    const numericVars = [
        { name: 'CONDUCTOR_TIMEOUT_MS', min: 1000, max: 300000 },
        { name: 'CONDUCTOR_MAX_CONCURRENT', min: 1, max: 100 },
        { name: 'GRAPHOPS_PORT', min: 1024, max: 65535 },
        { name: 'FILES_PORT', min: 1024, max: 65535 },
    ];
    numericVars.forEach(({ name, min, max }) => {
        const value = process.env[name];
        if (value) {
            const numValue = parseInt(value, 10);
            if (isNaN(numValue) || numValue < min || numValue > max) {
                errors.push(`${name} must be a number between ${min} and ${max}, got: ${value}`);
            }
        }
    });
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
