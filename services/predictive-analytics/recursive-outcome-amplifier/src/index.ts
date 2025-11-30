/**
 * Recursive Outcome Amplifier™ Service
 * Entry point and exports
 */

import { ApolloServer } from '@apollo/server';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { OutcomeAmplifier } from './OutcomeAmplifier.js';
import {
  createContext,
  outcomeResolvers,
} from './resolvers/outcomeResolvers.js';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = pino({ name: 'RecursiveOutcomeAmplifier' });

/**
 * Load GraphQL schema
 */
export function loadSchema(): string {
  const schemaPath = join(__dirname, '../schema.graphql');
  return readFileSync(schemaPath, 'utf-8');
}

/**
 * Create Apollo Server instance
 */
export async function createServer(
  amplifier: OutcomeAmplifier,
): Promise<ApolloServer> {
  const typeDefs = loadSchema();

  const server = new ApolloServer({
    typeDefs,
    resolvers: outcomeResolvers,
  });

  return server;
}

/**
 * Start the service
 */
export async function startService(port: number = 4002): Promise<void> {
  try {
    // Create amplifier instance
    const amplifier = new OutcomeAmplifier({
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
  } catch (error) {
    logger.error({ error }, 'Failed to start service');
    throw error;
  }
}

// Export main classes and types
export { OutcomeAmplifier } from './OutcomeAmplifier.js';
export type { OutcomeAmplifierConfig } from './OutcomeAmplifier.js';

export { OutcomeNodeBuilder, createRootNode } from './models/OutcomeNode.js';
export type { OutcomeNode, OutcomeNodeInput } from './models/OutcomeNode.js';

export { CascadeMapBuilder, buildCascadeDAG } from './models/CascadeMap.js';
export type {
  CascadeMap,
  CascadeDAG,
  PropagationPath,
} from './models/CascadeMap.js';

export {
  LeveragePointBuilder,
  InterventionType,
  determineInterventionType,
  estimateInterventionCost,
} from './models/LeveragePoint.js';
export type { LeveragePoint } from './models/LeveragePoint.js';

export { PropagationEngine, createDefaultContext } from './algorithms/PropagationEngine.js';
export type {
  CausalLink,
  GraphContext,
  PropagationOptions,
} from './algorithms/PropagationEngine.js';

export { DampingCalculator } from './algorithms/DampingCalculator.js';
export type { DampeningConfig } from './algorithms/DampingCalculator.js';

export { CascadeSimulator } from './algorithms/CascadeSimulator.js';
export type { SimulationOptions } from './algorithms/CascadeSimulator.js';

export { LeverageIdentifier } from './algorithms/LeverageIdentifier.js';

export { outcomeResolvers, createContext } from './resolvers/outcomeResolvers.js';

// If running directly, start the service
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4002;
  startService(port).catch((error) => {
    logger.error({ error }, 'Service startup failed');
    process.exit(1);
  });
}
