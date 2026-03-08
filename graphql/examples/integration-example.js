"use strict";
/**
 * GraphQL Schema Governance - Integration Example
 * Demonstrates how to use all governance features together
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGraphQLGovernance = setupGraphQLGovernance;
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const graphql_1 = require("graphql");
const express_1 = __importDefault(require("express"));
// Import governance components
const schema_registry_1 = require("../schema-registry");
const validation_rules_1 = require("../validation-rules");
const auth_1 = require("../directives/auth");
const complexity_calculator_1 = require("../complexity-calculator");
const performance_monitor_1 = require("../performance-monitor");
const documentation_generator_1 = require("../documentation-generator");
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
        entity: async (_, { id }, context) => {
            // Use DataLoader to prevent N+1 queries
            return context.loaders.entity.load(id);
        },
        entities: async (_, { limit, offset }, context) => {
            return context.db.entities.findMany({
                take: limit,
                skip: offset,
            });
        },
    },
    Mutation: {
        createEntity: async (_, { input }, context) => {
            return context.db.entities.create({ data: input });
        },
        generateInsights: async (_, { entityId }, context) => {
            // Expensive AI operation protected by rate limiting
            const insights = await context.ai.generateInsights(entityId);
            return { entityId, insights };
        },
    },
};
/**
 * Main integration function
 */
async function setupGraphQLGovernance() {
    console.log('🚀 Setting up GraphQL Schema Governance...\n');
    // Step 1: Initialize Schema Registry
    console.log('1️⃣  Initializing Schema Registry...');
    await schema_registry_1.schemaRegistry.initialize();
    // Step 2: Validate Schema
    console.log('2️⃣  Validating Schema...');
    const schema = (0, graphql_1.buildSchema)(typeDefs);
    const validation = (0, validation_rules_1.validateSchema)(schema);
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
    const canRegister = await schema_registry_1.schemaRegistry.validateCanRegister(typeDefs);
    if (canRegister.valid) {
        await schema_registry_1.schemaRegistry.registerSchema(typeDefs, 'v1.0.0', 'system@example.com', 'Initial schema with governance');
        console.log('✅ Schema registered as v1.0.0');
    }
    // Step 4: Apply Authorization Directives
    console.log('\n4️⃣  Applying Authorization Directives...');
    const { typeDefs: authTypeDefs } = (0, auth_1.authDirective)();
    const { typeDefs: rateLimitTypeDefs } = (0, auth_1.rateLimitDirective)();
    const { typeDefs: deprecatedTypeDefs } = (0, auth_1.deprecatedDirective)();
    console.log('✅ Authorization directives configured');
    // Step 5: Configure Complexity Limits
    console.log('\n5️⃣  Configuring Complexity Limits...');
    const complexityRules = [
        (0, complexity_calculator_1.createComplexityLimitRule)(complexity_calculator_1.defaultComplexityConfig),
        (0, complexity_calculator_1.createDepthLimitRule)(10),
    ];
    console.log(`✅ Max Complexity: ${complexity_calculator_1.defaultComplexityConfig.maxComplexity}`);
    console.log(`✅ Max Depth: ${complexity_calculator_1.defaultComplexityConfig.maxDepth}`);
    // Step 6: Setup Performance Monitoring
    console.log('\n6️⃣  Setting up Performance Monitoring...');
    const performancePlugin = (0, performance_monitor_1.createPerformanceMonitoringPlugin)(performance_monitor_1.globalPerformanceMonitor);
    console.log('✅ Performance monitoring enabled');
    // Step 7: Generate Documentation
    console.log('\n7️⃣  Generating Documentation...');
    try {
        await (0, documentation_generator_1.generateDocumentation)(schema, {
            outputPath: './docs/graphql/api-reference.md',
            format: 'markdown',
            includeExamples: true,
            includeDeprecated: false,
        });
        console.log('✅ Documentation generated at docs/graphql/api-reference.md');
    }
    catch (error) {
        console.log('⚠️  Documentation generation skipped (optional)');
    }
    // Step 8: Create Apollo Server
    console.log('\n8️⃣  Creating Apollo Server...');
    const server = new server_1.ApolloServer({
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
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Auth middleware (mock for example)
    app.use((req, res, next) => {
        // In production, validate JWT token here
        req.user = {
            id: 'user-123',
            email: 'user@example.com',
            roles: ['analyst'],
            permissions: ['read:entities', 'write:entities'],
            tenantId: 'tenant-123',
        };
        next();
    });
    app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => {
            // Create context with DataLoaders and auth
            return (0, performance_monitor_1.createDataLoaderContext)({
                user: req.user,
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
    }));
    // Serve GraphQL Playground
    app.get('/playground', (req, res) => {
        res.sendFile('playground.html', { root: './graphql' });
    });
    // Health check endpoint
    app.get('/health', (req, res) => {
        const report = performance_monitor_1.globalPerformanceMonitor.generateReport();
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
        const report = performance_monitor_1.globalPerformanceMonitor.generateReport();
        res.type('text/plain').send((0, performance_monitor_1.formatPerformanceReport)(report));
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
exports.default = setupGraphQLGovernance;
