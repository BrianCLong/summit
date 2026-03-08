"use strict";
// @ts-nocheck
/**
 * Full Integration Example
 *
 * Demonstrates how to wire up all components of the PII system
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectedConnector = exports.metadataStore = exports.copilotGuard = exports.redactionMiddleware = exports.ingestionHook = void 0;
exports.ingestData = ingestData;
exports.querySensitiveData = querySensitiveData;
const express_1 = __importDefault(require("express"));
const schema_1 = require("@graphql-tools/schema");
const pg_1 = require("pg");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
// Import PII system components
const index_js_1 = require("../index.js");
/**
 * 1. Initialize Database Connections
 */
const postgresPool = new pg_1.Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'summit',
    user: process.env.POSTGRES_USER || 'summit',
    password: process.env.POSTGRES_PASSWORD,
});
const neo4jDriver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'));
/**
 * 2. Create Metadata Store
 */
const metadataStore = (0, index_js_1.createMetadataStore)({
    postgresClient: {
        query: async (text, values) => {
            return await postgresPool.query(text, values);
        },
    },
    neo4jDriver: {
        executeQuery: async (query, params) => {
            const session = neo4jDriver.session();
            try {
                return await session.run(query, params);
            }
            finally {
                await session.close();
            }
        },
    },
});
exports.metadataStore = metadataStore;
/**
 * 3. Configure Ingestion Hooks
 */
const ingestionHook = (0, index_js_1.createIngestionHook)({
    enabled: true,
    minimumConfidence: 0.7,
    metadataStore,
    autoTagCatalog: true,
    autoTagGraph: false, // Enable if using Neo4j directly
    autoTagSQL: false, // Enable if using SQL directly
    strictMode: false, // Set to true to block high-severity PII
    onHighSeverityDetected: async (entities) => {
        console.warn('🚨 High-severity PII detected:', {
            count: entities.length,
            types: entities.map(e => e.type),
        });
        // Send alert to security team
        // await alerting.send({
        //   severity: 'high',
        //   message: `High-severity PII detected: ${entities.map(e => e.type).join(', ')}`,
        // });
    },
});
exports.ingestionHook = ingestionHook;
/**
 * 4. Create Redaction Middleware
 */
const redactionMiddleware = new index_js_1.RedactionMiddleware({
    metadataStore,
});
exports.redactionMiddleware = redactionMiddleware;
/**
 * 5. Create Copilot Guard
 */
const copilotGuard = new index_js_1.EnhancedGuardedGenerator();
exports.copilotGuard = copilotGuard;
/**
 * 6. Example: Wrap a Connector
 */
class ExampleConnector {
    async fetch() {
        // Simulate fetching data from external source
        return [
            {
                id: 'user001',
                name: 'John Doe',
                email: 'john.doe@example.com',
                ssn: '123-45-6789',
            },
        ];
    }
}
const connector = new ExampleConnector();
const protectedConnector = (0, index_js_1.withPIIDetection)(connector, ingestionHook, {
    onDetection: (result) => {
        console.log('✓ PII detected during ingestion:', {
            recordId: result.catalogId,
            piiTypes: result.entities.map(e => e.type),
            sensitivity: result.sensitivityMetadata?.sensitivityClass,
        });
    },
    onBlocked: (result) => {
        console.error('✗ Ingestion blocked:', result.blockReason);
    },
});
exports.protectedConnector = protectedConnector;
/**
 * 7. GraphQL Integration
 */
const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String
    phone: String
    ssn: String
  }

  type Query {
    getUser(id: ID!): User
    listUsers: [User!]!
  }

  type Mutation {
    updateUser(id: ID!, email: String): User
  }
`;
const resolvers = {
    Query: {
        getUser: async (_, { id }, context) => {
            // Fetch user from database
            const result = await postgresPool.query('SELECT * FROM users WHERE id = $1', [id]);
            return result.rows[0];
        },
        listUsers: async (_, __, context) => {
            const result = await postgresPool.query('SELECT * FROM users');
            return result.rows;
        },
    },
};
// Wrap resolvers with redaction
const redactionWrapper = (0, index_js_1.createGraphQLRedactionMiddleware)(redactionMiddleware);
const wrappedResolvers = {
    Query: {
        getUser: redactionWrapper(resolvers.Query.getUser),
        listUsers: redactionWrapper(resolvers.Query.listUsers),
    },
};
const schema = (0, schema_1.makeExecutableSchema)({
    typeDefs,
    resolvers: wrappedResolvers,
});
/**
 * 8. REST API Integration
 */
const app = (0, express_1.default)();
// Apply global redaction middleware
app.use((0, index_js_1.createRESTRedactionMiddleware)(redactionMiddleware));
// Extract user context from request
app.use((req, res, next) => {
    // In production, extract from JWT or session
    req.user = {
        id: req.headers['x-user-id'] || 'anonymous',
        role: req.headers['x-user-role'] || 'VIEWER',
        clearance: parseInt(req.headers['x-clearance'] || '0'),
    };
    next();
});
app.get('/api/users/:id', async (req, res) => {
    const result = await postgresPool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = result.rows[0];
    // Response is automatically redacted by middleware
    res.json(user);
});
app.post('/api/export', async (req, res) => {
    const { query } = req.body;
    // Check export permissions
    const userContext = {
        userId: req.user.id,
        role: req.user.role,
        clearance: req.user.clearance,
        purpose: 'export',
        stepUpToken: req.headers['x-step-up-token'],
    };
    // Verify clearance and purpose
    if (!userContext.stepUpToken) {
        return res.status(403).json({
            error: 'Step-up authentication required for exports',
        });
    }
    if (!userContext.purpose) {
        return res.status(403).json({
            error: 'Purpose justification required',
        });
    }
    // Execute query
    const result = await postgresPool.query(query);
    // Redact results
    const redacted = await redactionMiddleware.redact(result.rows, userContext);
    if (redacted.accessDenied) {
        return res.status(403).json({
            error: redacted.denialReason,
        });
    }
    res.json({
        data: redacted.data,
        metadata: {
            recordCount: result.rows.length,
            redactedFields: redacted.redactedFields,
            redactedCount: redacted.redactedCount,
        },
    });
});
/**
 * 9. Copilot Integration
 */
app.post('/api/copilot/query', async (req, res) => {
    const { query } = req.body;
    const userContext = {
        userId: req.user.id,
        role: req.user.role,
        clearance: req.user.clearance,
    };
    // Guard input (sanitize PII from prompt)
    const inputGuard = await copilotGuard.guardInput(query, {
        user: userContext,
        query,
    });
    if (inputGuard.warnings.length > 0) {
        console.warn('Copilot input warnings:', inputGuard.warnings);
    }
    // Call LLM (simulated)
    const llmResponse = `User ${query} has email john.doe@example.com and SSN 123-45-6789`;
    // Guard output (redact PII from response)
    const outputGuard = await copilotGuard.guard(llmResponse, {
        user: userContext,
        query,
        includeRedactionNotices: true,
    });
    if (outputGuard.restricted) {
        return res.status(403).json({
            error: 'Content restricted due to insufficient clearance',
            restrictions: outputGuard.restrictions,
        });
    }
    res.json({
        content: outputGuard.content,
        warnings: outputGuard.warnings,
        metadata: {
            piiDetected: outputGuard.detectedEntities.length,
            redactedFields: outputGuard.redactedFields,
        },
    });
});
/**
 * 10. Manual Ingestion Example
 */
async function ingestData(records) {
    console.log(`Ingesting ${records.length} records...`);
    const results = await ingestionHook.processBatch(records);
    for (const result of results) {
        if (result.blocked) {
            console.error(`Record ${result.catalogId} blocked: ${result.blockReason}`);
            continue;
        }
        if (result.detected) {
            console.log(`Record ${result.catalogId} has PII:`, {
                piiTypes: result.entities.map(e => e.type),
                sensitivity: result.sensitivityMetadata?.sensitivityClass,
                regulatoryTags: result.sensitivityMetadata?.regulatoryTags,
            });
        }
    }
    return results;
}
/**
 * 11. Query with Sensitivity Filtering
 */
async function querySensitiveData(userContext, catalogId) {
    // Get catalog metadata
    if (catalogId && metadataStore) {
        const metadata = await metadataStore.getCatalogMetadata(catalogId);
        if (metadata) {
            // Check if user has clearance
            const requiredClearance = metadata.sensitivity.accessControl.minimumClearance;
            if (userContext.clearance < requiredClearance) {
                throw new Error(`Insufficient clearance. Required: ${requiredClearance}, have: ${userContext.clearance}`);
            }
            // Check if purpose is required
            if (metadata.sensitivity.accessControl.requirePurpose && !userContext.purpose) {
                throw new Error('Purpose justification required for this data');
            }
            // Check if step-up is required
            if (metadata.sensitivity.accessControl.requireStepUp && !userContext.stepUpToken) {
                throw new Error('Step-up authentication required');
            }
        }
    }
    // Execute query
    const result = await postgresPool.query('SELECT * FROM sensitive_table');
    // Apply redaction
    const redacted = await redactionMiddleware.redact(result.rows, userContext);
    if (redacted.accessDenied) {
        throw new Error(redacted.denialReason);
    }
    return redacted.data;
}
/**
 * 12. Startup and Health Check
 */
async function initialize() {
    console.log('Initializing PII detection system...');
    // Test database connections
    try {
        await postgresPool.query('SELECT 1');
        console.log('✓ PostgreSQL connected');
    }
    catch (error) {
        console.error('✗ PostgreSQL connection failed:', error);
    }
    try {
        await neo4jDriver.verifyConnectivity();
        console.log('✓ Neo4j connected');
    }
    catch (error) {
        console.error('✗ Neo4j connection failed:', error);
    }
    // Initialize metadata store (run migrations)
    try {
        await metadataStore.initialize();
        console.log('✓ Metadata store initialized');
    }
    catch (error) {
        console.error('✗ Metadata store initialization failed:', error);
    }
    console.log('PII detection system ready!');
}
/**
 * 13. Shutdown
 */
async function shutdown() {
    console.log('Shutting down...');
    await postgresPool.end();
    await neo4jDriver.close();
    console.log('Shutdown complete');
}
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await initialize();
    console.log(`Server running on port ${PORT}`);
});
// Handle shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
