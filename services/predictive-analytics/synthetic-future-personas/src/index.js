"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personaResolvers = exports.PersonaEngine = void 0;
const server_1 = require("@apollo/server");
const standalone_1 = require("@apollo/server/standalone");
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = require("path");
const PersonaEngine_js_1 = require("./PersonaEngine.js");
Object.defineProperty(exports, "PersonaEngine", { enumerable: true, get: function () { return PersonaEngine_js_1.PersonaEngine; } });
const personaResolvers_js_1 = require("./resolvers/personaResolvers.js");
Object.defineProperty(exports, "personaResolvers", { enumerable: true, get: function () { return personaResolvers_js_1.personaResolvers; } });
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
// Load GraphQL schema
const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../schema.graphql'), 'utf-8');
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
    const personaEngine = new PersonaEngine_js_1.PersonaEngine({
        neo4jUri: config.neo4jUri,
        neo4jUser: config.neo4jUser,
        neo4jPassword: config.neo4jPassword,
        logLevel: config.logLevel,
    });
    // Create Apollo Server
    const server = new server_1.ApolloServer({
        typeDefs,
        resolvers: personaResolvers_js_1.personaResolvers,
    });
    // Start server
    const { url } = await (0, standalone_1.startStandaloneServer)(server, {
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
