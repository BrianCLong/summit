// Conductor Configuration and Initialization
// Sets up MCP servers, registers them, and initializes the conductor system
import { initializeConductor } from './index';
import { mcpRegistry } from './mcp/client';
import GraphOpsServer from './mcp/servers/graphops-server';
import FilesServer from './mcp/servers/files-server';
const u1 = process.env.NEO4J_USER;
const u2 = process.env.NEO4J_USERNAME;
if (u1 && u2 && u1 !== u2) {
    console.warn('[config] NEO4J_USER and NEO4J_USERNAME both set; using NEO4J_USER (USERNAME deprecated Q4).');
}
export const NEO4J_USER_FINAL = u1 ?? u2;
/**
 * Initialize the complete Conductor system
 */
export async function initializeConductorSystem() {
    console.log('Initializing MoE+MCP Conductor system...');
    const requiredSecrets = [
        { name: 'NEO4J_URI', value: process.env.NEO4J_URI, defaultValue: 'bolt://localhost:7687' },
        { name: 'NEO4J_USER', value: NEO4J_USER_FINAL, defaultValue: 'neo4j' },
        { name: 'NEO4J_PASSWORD', value: process.env.NEO4J_PASSWORD, defaultValue: 'password' },
        { name: 'MCP_AUTH_TOKEN', value: process.env.MCP_AUTH_TOKEN, defaultValue: 'conductor-token-12345' },
        { name: 'MCP_ADMIN_TOKEN', value: process.env.MCP_ADMIN_TOKEN, defaultValue: 'admin-token-67890' },
        { name: 'LLM_LIGHT_API_KEY', value: process.env.LLM_LIGHT_API_KEY, defaultValue: '' },
        { name: 'LLM_HEAVY_API_KEY', value: process.env.LLM_HEAVY_API_KEY, defaultValue: '' },
        { name: 'FILES_BASE_PATH', value: process.env.FILES_BASE_PATH, defaultValue: '/tmp/intelgraph-files' },
    ];
    let missingSecrets = [];
    let defaultSecrets = [];
    for (const secret of requiredSecrets) {
        if (!secret.value || secret.value === '') {
            missingSecrets.push(secret.name);
        }
        else if (secret.value === secret.defaultValue) {
            defaultSecrets.push(secret.name);
        }
    }
    if (missingSecrets.length > 0 || defaultSecrets.length > 0) {
        console.error('\nFATAL ERROR: Conductor cannot start due to missing or insecure secrets.\n');
        if (missingSecrets.length > 0) {
            console.error(`Missing required environment variables: ${missingSecrets.join(', ')}`);
        }
        if (defaultSecrets.length > 0) {
            console.error(`Using insecure default values for: ${defaultSecrets.join(', ')}`);
            console.error('Please change these values for production deployments.');
        }
        console.error('Exiting process with non-zero status.\n');
        process.exit(1);
    }
    // Configuration from environment variables
    const config = {
        enabledExperts: [
            'LLM_LIGHT',
            'LLM_HEAVY',
            'GRAPH_TOOL',
            'RAG_TOOL',
            'FILES_TOOL',
            'OSINT_TOOL',
            'EXPORT_TOOL',
        ],
        defaultTimeoutMs: parseInt(process.env.CONDUCTOR_TIMEOUT_MS || '30000'),
        maxConcurrentTasks: parseInt(process.env.CONDUCTOR_MAX_CONCURRENT || '10'),
        auditEnabled: process.env.CONDUCTOR_AUDIT_ENABLED === 'true',
        llmProviders: {
            light: {
                endpoint: process.env.LLM_LIGHT_ENDPOINT || 'https://api.openai.com/v1',
                apiKey: process.env.LLM_LIGHT_API_KEY || '',
                model: process.env.LLM_LIGHT_MODEL || 'gpt-3.5-turbo',
            },
            heavy: {
                endpoint: process.env.LLM_HEAVY_ENDPOINT || 'https://api.openai.com/v1',
                apiKey: process.env.LLM_HEAVY_API_KEY || '',
                model: process.env.LLM_HEAVY_MODEL || 'gpt-4',
            },
        },
    };
    // Generate auth tokens (in production, these would be managed securely)
    const authTokens = [
        process.env.MCP_AUTH_TOKEN || 'conductor-token-12345',
        process.env.MCP_ADMIN_TOKEN || 'admin-token-67890',
    ];
    let graphOpsServer;
    let filesServer;
    try {
        // Start GraphOps MCP Server
        if (process.env.GRAPHOPS_ENABLED !== 'false') {
            const graphOpsConfig = {
                neo4jUri: process.env.NEO4J_URI || 'bolt://localhost:7687',
                neo4jUser: NEO4J_USER_FINAL || 'neo4j',
                neo4jPassword: process.env.NEO4J_PASSWORD || 'password',
                port: parseInt(process.env.GRAPHOPS_PORT || '8001'),
                authTokens,
                rateLimits: {
                    requestsPerSecond: 10,
                    requestsPerHour: 1000,
                },
            };
            graphOpsServer = new GraphOpsServer(graphOpsConfig);
            // Register GraphOps server with MCP registry
            mcpRegistry.register('graphops', {
                url: `ws://localhost:${graphOpsConfig.port}`,
                name: 'graphops',
                authToken: authTokens[0],
                tools: [
                    {
                        name: 'graph.query',
                        description: 'Execute parameterized Cypher queries',
                        schema: {
                            type: 'object',
                            properties: {
                                cypher: { type: 'string' },
                                params: { type: 'object' },
                                tenantId: { type: 'string' },
                            },
                            required: ['cypher'],
                        },
                        scopes: ['graph:read'],
                    },
                    {
                        name: 'graph.write',
                        description: 'Execute write operations',
                        schema: {
                            type: 'object',
                            properties: {
                                cypher: { type: 'string' },
                                params: { type: 'object' },
                                tenantId: { type: 'string' },
                            },
                            required: ['cypher'],
                        },
                        scopes: ['graph:write'],
                    },
                    {
                        name: 'graph.alg',
                        description: 'Execute graph algorithms',
                        schema: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                args: { type: 'object' },
                                tenantId: { type: 'string' },
                            },
                            required: ['name'],
                        },
                        scopes: ['graph:compute'],
                    },
                ],
            });
            console.log(`GraphOps MCP Server started on port ${graphOpsConfig.port}`);
        }
        // Start Files MCP Server
        if (process.env.FILES_ENABLED !== 'false') {
            const filesConfig = {
                port: parseInt(process.env.FILES_PORT || '8002'),
                basePath: process.env.FILES_BASE_PATH || '/tmp/intelgraph-files',
                authTokens,
                allowedExtensions: ['.txt', '.json', '.csv', '.pdf', '.docx', '.md'],
                maxFileSize: parseInt(process.env.FILES_MAX_SIZE || '10485760'), // 10MB
                rateLimits: {
                    requestsPerSecond: 5,
                    requestsPerHour: 500,
                },
            };
            filesServer = new FilesServer(filesConfig);
            // Register Files server
            mcpRegistry.register('files', {
                url: `ws://localhost:${filesConfig.port}`,
                name: 'files',
                authToken: authTokens[0],
                tools: [
                    {
                        name: 'files.search',
                        description: 'Search for files',
                        schema: {
                            type: 'object',
                            properties: {
                                query: { type: 'string' },
                                path: { type: 'string' },
                                extension: { type: 'string' },
                            },
                            required: ['query'],
                        },
                        scopes: ['files:read'],
                    },
                    {
                        name: 'files.get',
                        description: 'Read file contents',
                        schema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string' },
                                encoding: { type: 'string' },
                            },
                            required: ['path'],
                        },
                        scopes: ['files:read'],
                    },
                    {
                        name: 'files.put',
                        description: 'Write file contents',
                        schema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string' },
                                content: { type: 'string' },
                                encoding: { type: 'string' },
                            },
                            required: ['path', 'content'],
                        },
                        scopes: ['files:write'],
                    },
                ],
            });
            console.log(`Files MCP Server started on port ${filesConfig.port}`);
        }
        // Initialize the main Conductor
        initializeConductor(config);
        console.log('Conductor system initialized successfully');
        return { graphOpsServer, filesServer };
    }
    catch (error) {
        console.error('Failed to initialize Conductor system:', error);
        // Cleanup on failure
        if (graphOpsServer) {
            await graphOpsServer.shutdown();
        }
        if (filesServer) {
            await filesServer.shutdown();
        }
        throw error;
    }
}
/**
 * Shutdown the Conductor system gracefully
 */
export async function shutdownConductorSystem(servers) {
    console.log('Shutting down Conductor system...');
    try {
        // Shutdown MCP servers
        if (servers.graphOpsServer) {
            await servers.graphOpsServer.shutdown();
        }
        if (servers.filesServer) {
            await servers.filesServer.shutdown();
        }
        // Shutdown main conductor
        const { conductor } = await import('./index');
        if (conductor) {
            await conductor.shutdown();
        }
        console.log('Conductor system shutdown complete');
    }
    catch (error) {
        console.error('Error during Conductor shutdown:', error);
    }
}
/**
 * Get default environment configuration
 */
export function getConductorEnvConfig() {
    return {
        // Conductor settings
        CONDUCTOR_TIMEOUT_MS: '30000',
        CONDUCTOR_MAX_CONCURRENT: '10',
        CONDUCTOR_AUDIT_ENABLED: 'true',
        // LLM Provider settings
        LLM_LIGHT_ENDPOINT: 'https://api.openai.com/v1',
        LLM_LIGHT_MODEL: 'gpt-3.5-turbo',
        LLM_HEAVY_ENDPOINT: 'https://api.openai.com/v1',
        LLM_HEAVY_MODEL: 'gpt-4',
        // MCP Server settings
        GRAPHOPS_ENABLED: 'true',
        GRAPHOPS_PORT: '8001',
        FILES_ENABLED: 'true',
        FILES_PORT: '8002',
        FILES_BASE_PATH: '/tmp/intelgraph-files',
        FILES_MAX_SIZE: '10485760',
        // Authentication
        MCP_AUTH_TOKEN: 'conductor-token-12345',
        MCP_ADMIN_TOKEN: 'admin-token-67890',
    };
}
//# sourceMappingURL=config.js.map