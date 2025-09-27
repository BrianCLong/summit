const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Configuration
require('dotenv').config();

// Basic configuration
const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  }
};

// Simple logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`)
};

// Basic GraphQL schema and resolvers
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Query {
    hello: String
    status: String
  }

  type Mutation {
    ping: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello from IntelGraph Platform!',
    status: () => 'Server is running successfully'
  },
  Mutation: {
    ping: () => 'pong'
  }
};

async function startServer() {
  try {
    // Create Express app
    const app = express();
    const httpServer = createServer(app);
    
    // Initialize Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST']
      }
    });

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));
    
    // CORS configuration
    app.use(cors({
      origin: config.cors.origin,
      credentials: true
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP'
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
        version: '1.0.0'
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
        
        return {
          req,
          logger
        };
      }
    });
    
    await apolloServer.start();
    apolloServer.applyMiddleware({ 
      app, 
      path: '/graphql',
      cors: false
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
