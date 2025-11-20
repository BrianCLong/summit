/**
 * Full Integration Example
 *
 * Demonstrates how to wire up all components of the PII system
 */

import express from 'express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';

// Import PII system components
import {
  createIngestionHook,
  withPIIDetection,
  createMetadataStore,
  RedactionMiddleware,
  createGraphQLRedactionMiddleware,
  createRESTRedactionMiddleware,
  EnhancedGuardedGenerator,
  SensitivityClass,
  type IngestionRecord,
  type UserContext,
} from '../index.js';

/**
 * 1. Initialize Database Connections
 */
const postgresPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'summit',
  user: process.env.POSTGRES_USER || 'summit',
  password: process.env.POSTGRES_PASSWORD,
});

const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password',
  ),
);

/**
 * 2. Create Metadata Store
 */
const metadataStore = createMetadataStore({
  postgresClient: {
    query: async (text: string, values?: any[]) => {
      return await postgresPool.query(text, values);
    },
  },
  neo4jDriver: {
    executeQuery: async (query: string, params: Record<string, any>) => {
      const session = neo4jDriver.session();
      try {
        return await session.run(query, params);
      } finally {
        await session.close();
      }
    },
  },
});

/**
 * 3. Configure Ingestion Hooks
 */
const ingestionHook = createIngestionHook({
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

/**
 * 4. Create Redaction Middleware
 */
const redactionMiddleware = new RedactionMiddleware({
  metadataStore,
});

/**
 * 5. Create Copilot Guard
 */
const copilotGuard = new EnhancedGuardedGenerator();

/**
 * 6. Example: Wrap a Connector
 */
class ExampleConnector {
  async fetch(): Promise<any[]> {
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
const protectedConnector = withPIIDetection(connector, ingestionHook, {
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
    getUser: async (_: any, { id }: { id: string }, context: any) => {
      // Fetch user from database
      const result = await postgresPool.query(
        'SELECT * FROM users WHERE id = $1',
        [id],
      );
      return result.rows[0];
    },
    listUsers: async (_: any, __: any, context: any) => {
      const result = await postgresPool.query('SELECT * FROM users');
      return result.rows;
    },
  },
};

// Wrap resolvers with redaction
const redactionWrapper = createGraphQLRedactionMiddleware(redactionMiddleware);

const wrappedResolvers = {
  Query: {
    getUser: redactionWrapper(resolvers.Query.getUser),
    listUsers: redactionWrapper(resolvers.Query.listUsers),
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers: wrappedResolvers,
});

/**
 * 8. REST API Integration
 */
const app = express();

// Apply global redaction middleware
app.use(createRESTRedactionMiddleware(redactionMiddleware));

// Extract user context from request
app.use((req: any, res, next) => {
  // In production, extract from JWT or session
  req.user = {
    id: req.headers['x-user-id'] || 'anonymous',
    role: req.headers['x-user-role'] || 'VIEWER',
    clearance: parseInt(req.headers['x-clearance'] || '0'),
  };
  next();
});

app.get('/api/users/:id', async (req: any, res) => {
  const result = await postgresPool.query(
    'SELECT * FROM users WHERE id = $1',
    [req.params.id],
  );

  const user = result.rows[0];

  // Response is automatically redacted by middleware
  res.json(user);
});

app.post('/api/export', async (req: any, res) => {
  const { query } = req.body;

  // Check export permissions
  const userContext: UserContext = {
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
app.post('/api/copilot/query', async (req: any, res) => {
  const { query } = req.body;

  const userContext: UserContext = {
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
async function ingestData(records: IngestionRecord[]) {
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
async function querySensitiveData(
  userContext: UserContext,
  catalogId?: string,
) {
  // Get catalog metadata
  if (catalogId && metadataStore) {
    const metadata = await metadataStore.getCatalogMetadata(catalogId);

    if (metadata) {
      // Check if user has clearance
      const requiredClearance = metadata.sensitivity.accessControl.minimumClearance;
      if (userContext.clearance < requiredClearance) {
        throw new Error(
          `Insufficient clearance. Required: ${requiredClearance}, have: ${userContext.clearance}`,
        );
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
  } catch (error) {
    console.error('✗ PostgreSQL connection failed:', error);
  }

  try {
    await neo4jDriver.verifyConnectivity();
    console.log('✓ Neo4j connected');
  } catch (error) {
    console.error('✗ Neo4j connection failed:', error);
  }

  // Initialize metadata store (run migrations)
  try {
    await metadataStore.initialize();
    console.log('✓ Metadata store initialized');
  } catch (error) {
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

// Export for testing
export {
  ingestionHook,
  redactionMiddleware,
  copilotGuard,
  metadataStore,
  protectedConnector,
  ingestData,
  querySensitiveData,
};
