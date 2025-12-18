import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PersonaEngine } from './PersonaEngine.js';
import { personaResolvers } from './resolvers/personaResolvers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load GraphQL schema
const typeDefs = readFileSync(
  join(__dirname, '../schema.graphql'),
  'utf-8',
);

// Configuration from environment
const config = {
  neo4jUri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4jUser: process.env.NEO4J_USER || 'neo4j',
  neo4jPassword: process.env.NEO4J_PASSWORD || 'password',
  port: parseInt(process.env.PORT || '4001', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
};

/**
 * Main server initialization
 */
async function main() {
  console.log('Initializing Synthetic Future Personas Service...');

  // Create PersonaEngine instance
  const personaEngine = new PersonaEngine({
    neo4jUri: config.neo4jUri,
    neo4jUser: config.neo4jUser,
    neo4jPassword: config.neo4jPassword,
    logLevel: config.logLevel,
  });

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers: personaResolvers,
  });

  // Start server
  const { url } = await startStandaloneServer(server, {
    listen: { port: config.port },
    context: async () => ({
      personaEngine,
    }),
  });

  console.log(`🚀 Synthetic Future Personas Service ready at ${url}`);
  console.log(`📊 Connected to Neo4j at ${config.neo4jUri}`);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await personaEngine.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down gracefully...');
    await personaEngine.close();
    process.exit(0);
  });
}

// Start the service
main().catch((error) => {
  console.error('Fatal error starting service:', error);
  process.exit(1);
});

// Export for testing
export { PersonaEngine, personaResolvers };
