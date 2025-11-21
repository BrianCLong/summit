const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Configuration
const config = require('./src/config');

// Database
const { connectNeo4j, connectPostgres, connectRedis, closeConnections } = require('./src/config/database');

// Services
const GraphService = require('./src/services/GraphService');
const EntityService = require('./src/services/EntityService');
const GraphAnalysisService = require('./src/services/GraphAnalysisService');

// GraphQL Schema
const { typeDefs } = require('./src/graphql/schema');

// Simple logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
};

// Resolvers
const graphService = new GraphService();
const entityService = new EntityService();
const graphAnalysisService = new GraphAnalysisService();

const resolvers = {
  Query: {
    hello: () => 'Hello from IntelGraph Platform!',
    status: () => 'Server is running successfully',

    // Graph Queries
    graphData: async (_, { investigationId }) => {
        return await graphService.getInvestigationGraph(investigationId);
    },

    searchEntities: async (_, { query, investigationId, limit }) => {
        return await entityService.searchEntities(query, investigationId, limit);
    },

    // Provenance
    decision: async (_, { id }) => {
        return await graphService.getDecisionProvenance(id);
    }
  },
  Mutation: {
    ping: () => 'pong',

    // Provenance
    createDecision: async (_, { input }, context) => {
        // Mock userId for now if not in context
        const userId = context.user ? context.user.id : 'unknown-user';
        return await graphService.createDecision({
            ...input,
            userId
        });
    }
  },
  // Resolving Interface/Union types or complex fields would go here
  GraphNode: {
      type: (parent) => parent.type || 'CUSTOM' // Fallback
  }
};

async function startServer() {
  try {
    // Connect to Databases
    try {
        await connectNeo4j();
    } catch (e) {
        logger.warn('Neo4j connection failed, some features will be unavailable.');
    }

    try {
        await connectPostgres();
    } catch (e) {
         logger.warn('Postgres connection failed.');
    }

    try {
        await connectRedis();
    } catch (e) {
        logger.warn('Redis connection failed.');
    }

    // Create Express app
    const app = express();
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
      },
    });

    // Security middleware
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
      }),
    );

    // CORS configuration
    app.use(
      cors({
        origin: config.cors.origin,
        credentials: true,
      }),
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP',
    });
    app.use(limiter);

    // Request parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    app.use(morgan('combined'));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.env,
        version: '1.0.0',
      });
    });

    // Apollo GraphQL Server
    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: async ({ req, connection }) => {
        if (connection) {
          return connection.context;
        }

        // TODO: Extract user from token
        const user = { id: 'mock-user-id', role: 'ADMIN' };

        return {
          req,
          logger,
          user
        };
      },
    });

    await apolloServer.start();
    apolloServer.applyMiddleware({
      app,
      path: '/graphql',
      cors: false,
    });

    // Socket.IO setup
    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    // Error handling
    app.use((err, req, res, next) => {
      logger.error(`Error: ${err.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Start server
    const PORT = config.port;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      logger.info(`🔌 Socket.IO enabled`);
      logger.info(`🌍 Environment: ${config.env}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await apolloServer.stop();
      await closeConnections();
      httpServer.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Start the server
startServer();
