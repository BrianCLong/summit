const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

require('dotenv').config();
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { 
  connectNeo4j, 
  connectPostgres, 
  connectRedis,
  closeConnections 
} = require('./src/config/database');

const { typeDefs } = require('./src/graphql/schema');
const resolvers = require('./src/graphql/resolvers');
const AuthService = require('./src/services/AuthService');

async function startServer() {
  try {
    const app = express();
    const httpServer = createServer(app);
    
    const io = new Server(httpServer, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST']
      }
    });

    logger.info('🔗 Connecting to databases...');
    await connectNeo4j();
    await connectPostgres();
    await connectRedis();
    logger.info('✅ All databases connected');

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
    
    app.use(cors({
      origin: config.cors.origin,
      credentials: true
    }));
    
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP'
    });
    app.use(limiter);
    
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    app.use(morgan('combined', { 
      stream: { write: message => logger.info(message.trim()) }
    }));
    
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.env,
        version: '1.0.0',
        services: {
          neo4j: 'connected',
          postgres: 'connected',
          redis: 'connected'
        },
        features: {
          ai_analysis: 'enabled',
          real_time: 'enabled',
          authentication: 'enabled'
        }
      });
    });
    
    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: async ({ req, connection }) => {
        if (connection) {
          return connection.context;
        }
        
        const token = req.headers.authorization?.replace('Bearer ', '');
        let user = null;
        
        if (token) {
          const authService = new AuthService();
          user = await authService.verifyToken(token);
        }
        
        return {
          user,
          req,
          logger
        };
      },
      subscriptions: {
        onConnect: async (connectionParams) => {
          const token = connectionParams.authorization?.replace('Bearer ', '');
          let user = null;
          
          if (token) {
            const authService = new AuthService();
            user = await authService.verifyToken(token);
          }
          
          return { user };
        }
      },
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                logger.info(`GraphQL Operation: ${requestContext.request.operationName}`);
              },
              didEncounterErrors(requestContext) {
                logger.error('GraphQL Error:', requestContext.errors);
              }
            };
          }
        }
      ]
    });
    
    await apolloServer.start();
    apolloServer.applyMiddleware({ 
      app, 
      path: '/graphql',
      cors: false
    });

    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      socket.on('join_investigation', (investigationId) => {
        socket.join(`investigation_${investigationId}`);
        logger.info(`Client ${socket.id} joined investigation ${investigationId}`);
      });
      
      socket.on('leave_investigation', (investigationId) => {
        socket.leave(`investigation_${investigationId}`);
        logger.info(`Client ${socket.id} left investigation ${investigationId}`);
      });
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
    
    app.use((err, req, res, next) => {
      logger.error(`Unhandled error: ${err.message}`, err);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: config.env === 'development' ? err.message : 'Something went wrong'
      });
    });
    
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
    
    const PORT = config.port;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 IntelGraph AI Server running on port ${PORT}`);
      logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      logger.info(`🔌 WebSocket subscriptions enabled`);
      logger.info(`🌍 Environment: ${config.env}`);
      logger.info(`🤖 AI features enabled`);
      logger.info(`🛡️  Security features enabled`);
      logger.info(`📈 Real-time updates enabled`);
    });
    
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
    logger.error(`Failed to start server: ${error.message}`, error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection:`, reason);
  process.exit(1);
});

startServer();
