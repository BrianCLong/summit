/**
 * GraphQL Schema Governance - Integration Example
 * Demonstrates how to use all governance features together
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSchema } from 'graphql';
import express from 'express';

// Import governance components
import { schemaRegistry } from '../schema-registry';
import { validateSchema } from '../validation-rules';
import {
  authDirective,
  rateLimitDirective,
  deprecatedDirective,
} from '../directives/auth';
import {
  createComplexityLimitRule,
  createDepthLimitRule,
  defaultComplexityConfig,
} from '../complexity-calculator';
import {
  globalPerformanceMonitor,
  createPerformanceMonitoringPlugin,
  createDataLoaderContext,
  formatPerformanceReport,
} from '../performance-monitor';
import { generateDocumentation } from '../documentation-generator';

// Example schema
const typeDefs = `
  scalar JSON
  scalar DateTime

  type Entity @key(fields: "id") {
    id: ID!
    type: String!
    props: JSON
    createdAt: DateTime!
  }

  type Query {
    """
    Get a single entity by ID
    """
    entity(id: ID!): Entity @auth

    """
    List entities with pagination
    """
    entities(
      limit: Int = 25
      offset: Int = 0
    ): [Entity!]! @auth
  }

  type Mutation {
    """
    Create a new entity
    """
    createEntity(input: EntityInput!): Entity!
      @auth(roles: ["admin", "analyst"])
      @rateLimit(max: 100, window: 60)

    """
    Generate AI insights for an entity
    """
    generateInsights(entityId: ID!): EntityInsights!
      @auth
      @rateLimit(max: 10, window: 60, scope: USER)
  }

  input EntityInput {
    type: String!
    props: JSON
  }

  type EntityInsights {
    entityId: ID!
    insights: [String!]!
  }
`;

// Example resolvers
const resolvers = {
  Query: {
    entity: async (_: any, { id }: any, context: any) => {
      // Use DataLoader to prevent N+1 queries
      return context.loaders.entity.load(id);
    },

    entities: async (_: any, { limit, offset }: any, context: any) => {
      return context.db.entities.findMany({
        take: limit,
        skip: offset,
      });
    },
  },

  Mutation: {
    createEntity: async (_: any, { input }: any, context: any) => {
      return context.db.entities.create({ data: input });
    },

    generateInsights: async (_: any, { entityId }: any, context: any) => {
      // Expensive AI operation protected by rate limiting
      const insights = await context.ai.generateInsights(entityId);
      return { entityId, insights };
    },
  },
};

/**
 * Main integration function
 */
export async function setupGraphQLGovernance() {
  console.log('🚀 Setting up GraphQL Schema Governance...\n');

  // Step 1: Initialize Schema Registry
  console.log('1️⃣  Initializing Schema Registry...');
  await schemaRegistry.initialize();

  // Step 2: Validate Schema
  console.log('2️⃣  Validating Schema...');
  const schema = buildSchema(typeDefs);
  const validation = validateSchema(schema);

  if (!validation.valid) {
    console.error('❌ Schema validation failed:');
    validation.errors.forEach((err) => {
      console.error(`  - [${err.rule}] ${err.message}`);
    });
    throw new Error('Schema validation failed');
  }

  console.log(`✅ Schema validation passed`);
  if (validation.warnings.length > 0) {
    console.log(`⚠️  ${validation.warnings.length} warnings:`);
    validation.warnings.forEach((warn) => {
      console.log(`  - [${warn.rule}] ${warn.message}`);
    });
  }

  // Step 3: Register Schema Version
  console.log('\n3️⃣  Registering Schema Version...');
  const canRegister = await schemaRegistry.validateCanRegister(typeDefs);
  if (canRegister.valid) {
    await schemaRegistry.registerSchema(
      typeDefs,
      'v1.0.0',
      'system@example.com',
      'Initial schema with governance'
    );
    console.log('✅ Schema registered as v1.0.0');
  }

  // Step 4: Apply Authorization Directives
  console.log('\n4️⃣  Applying Authorization Directives...');
  const { typeDefs: authTypeDefs } = authDirective();
  const { typeDefs: rateLimitTypeDefs } = rateLimitDirective();
  const { typeDefs: deprecatedTypeDefs } = deprecatedDirective();
  console.log('✅ Authorization directives configured');

  // Step 5: Configure Complexity Limits
  console.log('\n5️⃣  Configuring Complexity Limits...');
  const complexityRules = [
    createComplexityLimitRule(defaultComplexityConfig),
    createDepthLimitRule(10),
  ];
  console.log(`✅ Max Complexity: ${defaultComplexityConfig.maxComplexity}`);
  console.log(`✅ Max Depth: ${defaultComplexityConfig.maxDepth}`);

  // Step 6: Setup Performance Monitoring
  console.log('\n6️⃣  Setting up Performance Monitoring...');
  const performancePlugin = createPerformanceMonitoringPlugin(
    globalPerformanceMonitor
  );
  console.log('✅ Performance monitoring enabled');

  // Step 7: Generate Documentation
  console.log('\n7️⃣  Generating Documentation...');
  try {
    await generateDocumentation(schema, {
      outputPath: './docs/graphql/api-reference.md',
      format: 'markdown',
      includeExamples: true,
      includeDeprecated: false,
    });
    console.log('✅ Documentation generated at docs/graphql/api-reference.md');
  } catch (error) {
    console.log('⚠️  Documentation generation skipped (optional)');
  }

  // Step 8: Create Apollo Server
  console.log('\n8️⃣  Creating Apollo Server...');
  const server = new ApolloServer({
    typeDefs: [authTypeDefs, rateLimitTypeDefs, deprecatedTypeDefs, typeDefs],
    resolvers,
    plugins: [performancePlugin],
    validationRules: complexityRules,
    introspection: true,
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  });

  await server.start();
  console.log('✅ Apollo Server started');

  // Step 9: Setup Express Middleware
  console.log('\n9️⃣  Setting up Express Middleware...');
  const app = express();
  app.use(express.json());

  // Auth middleware (mock for example)
  app.use((req, res, next) => {
    // In production, validate JWT token here
    (req as any).user = {
      id: 'user-123',
      email: 'user@example.com',
      roles: ['analyst'],
      permissions: ['read:entities', 'write:entities'],
      tenantId: 'tenant-123',
    };
    next();
  });

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Create context with DataLoaders and auth
        return createDataLoaderContext({
          user: (req as any).user,
          db: {
            entities: {
              findMany: async () => [],
              create: async () => ({}),
              findById: async () => null,
            },
          },
          ai: {
            generateInsights: async () => [],
          },
        });
      },
    })
  );

  // Serve GraphQL Playground
  app.get('/playground', (req, res) => {
    res.sendFile('playground.html', { root: './graphql' });
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    const report = globalPerformanceMonitor.generateReport();
    res.json({
      status: 'healthy',
      version: 'v1.0.0',
      performance: {
        totalExecutionTime: report.totalExecutionTime,
        slowResolvers: report.slowResolvers.length,
        nPlusOneQueries: report.nPlusOneQueries.length,
      },
    });
  });

  // Performance report endpoint
  app.get('/performance', (req, res) => {
    const report = globalPerformanceMonitor.generateReport();
    res.type('text/plain').send(formatPerformanceReport(report));
  });

  console.log('\n✅ GraphQL Schema Governance Setup Complete!\n');
  console.log('📊 Features Enabled:');
  console.log('  ✓ Schema versioning and registry');
  console.log('  ✓ Automated validation rules');
  console.log('  ✓ Field-level authorization (@auth, @rateLimit)');
  console.log('  ✓ Query complexity limits');
  console.log('  ✓ Performance monitoring');
  console.log('  ✓ N+1 query detection');
  console.log('  ✓ Auto-generated documentation');
  console.log('  ✓ GraphQL Playground with auth\n');

  return { app, server };
}

/**
 * Example: Start the server
 */
async function main() {
  const { app } = await setupGraphQLGovernance();

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🎮 Playground at http://localhost:${PORT}/playground`);
    console.log(`📊 Performance at http://localhost:${PORT}/performance`);
    console.log(`❤️  Health check at http://localhost:${PORT}/health`);
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export default setupGraphQLGovernance;
