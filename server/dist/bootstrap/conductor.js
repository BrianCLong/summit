// Conductor Bootstrap Module
// Integrates the Conductor (MoE+MCP) system with Apollo Server and Express
// Author: IntelGraph Platform Engineering
import { ApolloServer } from '@apollo/server';
import express from 'express';
// import { expressMiddleware } from '@as-integrations/express4';
import cors from 'cors';
import { typeDefs as schema } from '../graphql/schema/index.js';
import logger from '../config/logger';
import { initializeConductorSystem, shutdownConductorSystem } from '../conductor/config';
import { createConductorGraphQLPlugin } from '../conductor/observability';
const conductorLogger = logger.child({ name: 'conductor-bootstrap' });
/**
 * Wire the Conductor system into the main application
 * This function should be called during server startup after Apollo initialization
 */
export async function wireConductor(options) {
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
        const servers = await initializeConductorSystem();
        // Add Apollo Server plugin for OTEL tracing and context propagation
        if (options.apollo) {
            options.apollo.addPlugin(createConductorGraphQLPlugin());
            conductorLogger.info('Added Conductor Apollo plugin for observability');
        }
        // Add GraphQL endpoint for Conductor
        if (options.app) {
            const apollo = new ApolloServer({ schema, introspection: true });
            await apollo.start();
            options.app.use('/graphql', cors(), express.json());
            conductorLogger.info('[conductor] GraphQL mounted at /graphql');
        }
        // Add Express middleware for conductor health checks if needed
        if (options.app) {
            options.app.get('/health/conductor', async (req, res) => {
                try {
                    const { getConductorHealth } = await import('../conductor/metrics');
                    const health = await getConductorHealth();
                    const statusCode = health.status === 'pass' ? 200 : health.status === 'warn' ? 200 : 503;
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
                await shutdownConductorSystem(servers);
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
export function validateConductorEnvironment() {
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
//# sourceMappingURL=conductor.js.map