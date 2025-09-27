const express = require('express');
const path = require('path');
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
  getPostgresPool,
  getRedisClient,
  closeConnections 
} = require('./src/config/database');
const pkg = require('./package.json');

const { typeDefs } = require('./src/graphql/schema');
const resolvers = require('./src/graphql/resolvers');
const AuthService = require('./src/services/AuthService');
const WebSocketService = require('./src/services/WebSocketService');
const GeointService = require('./src/services/GeointService');
const SentimentService = require('./src/services/SentimentService');
const ContextAnalysisService = require('./src/services/ContextAnalysisService');
const RelationshipService = require('./src/services/RelationshipService');
const GraphAnalyticsService = require('./src/services/GraphAnalyticsService');
const MultiModalService = require('./src/services/MultiModalService');
const OSINTService = require('./src/services/OSINTService');
const RuleRunnerService = require('./src/services/RuleRunnerService');
const { startWorkers, socialQueue } = require('./src/services/QueueService');
const { ExpressAdapter } = require('@bull-board/express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');

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
    const neo4jDriver = await connectNeo4j();
    await connectPostgres();
    await connectRedis();
    logger.info('✅ All databases connected');

    // Initialize services
    logger.info('🔧 Initializing services...');
    const webSocketService = new WebSocketService(httpServer, neo4jDriver);
    app.locals.ws = webSocketService;
    const geointService = new GeointService();
    const sentimentService = new SentimentService();
    const contextAnalysisService = new ContextAnalysisService();
    const relationshipService = new RelationshipService();
    const graphAnalyticsService = new GraphAnalyticsService();
    const multiModalService = new MultiModalService();
    const osintService = new OSINTService();
    const ruleRunner = new RuleRunnerService(logger, { intervalMs: 60000, threshold: Number(process.env.ALERT_THRESHOLD || 0.85) });

    // Start queue workers and mount dashboard
    startWorkers();
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');
    createBullBoard({ queues: [new BullMQAdapter(socialQueue)], serverAdapter });
    app.use('/admin/queues', serverAdapter.getRouter());
    
    // Set Neo4j driver for services that need it
    relationshipService.setDriver(neo4jDriver);
    graphAnalyticsService.setDriver(neo4jDriver);
    
    logger.info('✅ All services initialized');
    ruleRunner.start();

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

    // Serve uploaded reports and assets
    const uploadsDir = path.join(process.cwd(), 'uploads');
    app.use('/uploads', express.static(uploadsDir));

    // REST routes
    app.use('/api/entities', require('./src/routes/entities'));
    app.use('/api/nlp', require('./src/routes/nlp'));
    app.use('/api/export', require('./src/routes/export'));
    app.use('/api/activity', require('./src/routes/activity'));
    app.use('/api/admin', require('./src/routes/admin'));
    app.use('/api/vision', require('./src/routes/vision'));
    
    // System stats (connections, rooms, etc.)
    app.get('/api/system/stats', (req, res) => {
      try {
        const ws = req.app.locals.ws;
        const stats = ws?.getConnectionStats ? ws.getConnectionStats() : {};
        const mem = process.memoryUsage();
        res.json({
          connections: stats,
          process: {
            pid: process.pid,
            memory: {
              rss: mem.rss,
              heapTotal: mem.heapTotal,
              heapUsed: mem.heapUsed,
              external: mem.external
            },
            uptimeSec: Math.round(process.uptime())
          }
        });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Version endpoint
    app.get('/api/version', (req, res) => {
      const versionInfo = {
        name: pkg.name,
        version: pkg.version,
        env: config.env,
        commit: process.env.GIT_SHA || process.env.BUILD_SHA || null,
        timestamp: new Date().toISOString(),
      };
      res.set('Cache-Control', 'no-store');
      res.status(200).json(versionInfo);
    });

    // Healthz and Readyz helpers
    async function dbStatuses() {
      const statuses = { neo4j: 'unknown', postgres: 'unknown', redis: 'unknown' };
      try {
        const session = neo4jDriver.session();
        await session.run('RETURN 1');
        await session.close();
        statuses.neo4j = 'ok';
      } catch (e) {
        statuses.neo4j = 'error';
      }
      try {
        const client = getPostgresPool().connect ? await getPostgresPool().connect() : null;
        if (client) {
          await client.query('SELECT 1');
          client.release();
        }
        statuses.postgres = 'ok';
      } catch (e) {
        statuses.postgres = 'error';
      }
      try {
        const pong = await getRedisClient().ping();
        statuses.redis = pong === 'PONG' ? 'ok' : 'error';
      } catch (e) {
        statuses.redis = 'error';
      }
      return statuses;
    }

    // Liveness/healthcheck
    app.get('/api/healthz', async (req, res) => {
      const statuses = await dbStatuses();
      const ok = Object.values(statuses).every((s) => s === 'ok');
      res.set('Cache-Control', 'no-store');
      res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', services: statuses, timestamp: new Date().toISOString() });
    });

    // Readiness
    app.get('/api/readyz', async (req, res) => {
      const statuses = await dbStatuses();
      const ready = Object.values(statuses).every((s) => s === 'ok');
      res.set('Cache-Control', 'no-store');
      res.status(ready ? 200 : 503).json({ ready, services: statuses, timestamp: new Date().toISOString() });
    });

    // GEOINT routes
    app.use('/api/geoint', require('./src/routes/geoint'));

    // Metrics (Prometheus) — optional; works if prom-client is installed
    let promClient;
    try { promClient = require('prom-client'); } catch { promClient = null; }
    if (promClient) {
      promClient.collectDefaultMetrics();
      app.get('/metrics', async (req, res) => {
        try {
          res.set('Content-Type', promClient.register.contentType);
          res.end(await promClient.register.metrics());
        } catch (e) {
          res.status(500).send(e.message);
        }
      });
    }

    // Database-specific health endpoints
    app.get('/api/db/neo4j', async (req, res) => {
      try {
        const session = neo4jDriver.session();
        await session.run('RETURN 1');
        await session.close();
        res.status(200).json({ status: 'ok' });
      } catch (e) {
        res.status(503).json({ status: 'error', error: e.message });
      }
    });

    app.get('/api/db/postgres', async (req, res) => {
      try {
        const pool = getPostgresPool();
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        res.status(200).json({ status: 'ok' });
      } catch (e) {
        res.status(503).json({ status: 'error', error: e.message });
      }
    });

    app.get('/api/db/redis', async (req, res) => {
      try {
        const pong = await getRedisClient().ping();
        res.status(pong === 'PONG' ? 200 : 503).json({ status: pong === 'PONG' ? 'ok' : 'error' });
      } catch (e) {
        res.status(503).json({ status: 'error', error: e.message });
      }
    });
    
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.env,
        version: '1.0.0',
        services: {
          neo4j: 'connected',
          postgres: 'connected',
          redis: 'connected',
          websocket: 'connected'
        },
        features: {
          ai_analysis: 'enabled',
          geoint_analysis: 'enabled',
          sentiment_analysis: 'enabled',
          context_analysis: 'enabled',
          relationship_types: 'enabled',
          graph_analytics: 'enabled',
          real_time_collaboration: 'enabled',
          user_presence: 'enabled',
          commenting: 'enabled',
          annotations: 'enabled',
          authentication: 'enabled',
          war_room_sync: 'enabled',
          graph_synchronization: 'enabled',
          conflict_resolution: 'enabled'
        },
        warRoom: {
          activeRooms: webSocketService.getWarRoomSyncService().warRooms.size,
          metrics: webSocketService.getWarRoomSyncService().metrics
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
          logger,
          services: {
            geoint: geointService,
            sentiment: sentimentService,
            contextAnalysis: contextAnalysisService,
            relationship: relationshipService,
            graphAnalytics: graphAnalyticsService,
            multimodal: multiModalService,
            osint: osintService,
            webSocket: webSocketService
          }
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

    // Initialize War Room API routes
    const { initializeRoutes } = require('./src/routes/warRoomRoutes');
    const authService = new AuthService();
    const warRoomRouter = initializeRoutes(webSocketService.getWarRoomSyncService(), authService);
    app.use('/api/war-rooms', warRoomRouter);

    // Mount Federation API routes
    try {
      const { initializeRoutes: initFederationRoutes } = require('./src/routes/federationRoutes');
      const federationRouter = initFederationRoutes(authService);
      app.use('/api/federation', federationRouter);
      logger.info('🌐 Federation routes mounted at /api/federation');
    } catch (e) {
      logger.warn('Federation routes not mounted:', e.message);
    }

    // Mount Reports API routes
    try {
      const reportRoutes = require('./src/routes/reportRoutes');
      app.use('/api/reports', reportRoutes);
      logger.info('📝 Report routes mounted at /api/reports');
    } catch (e) {
      logger.warn('Report routes not mounted:', e.message);
    }

    // Mount ML API routes
    try {
      const mlRoutes = require('./src/routes/mlRoutes');
      app.use('/api/ml', mlRoutes);
      logger.info('🧠 ML routes mounted at /api/ml');
    } catch (e) {
      logger.warn('ML routes not mounted:', e.message);
    }

    // Mount External API routes
    try {
      const externalRoutes = require('./src/routes/externalRoutes');
      app.use('/api/external', externalRoutes);
      logger.info('🌐 External API routes mounted at /api/external');
    } catch (e) {
      logger.warn('External routes not mounted:', e.message);
    }

    // Mount Simulation API routes
    try {
      const simulationRoutes = require('./src/routes/simulationRoutes');
      app.use('/api/simulate', simulationRoutes);
      logger.info('🧪 Simulation routes mounted at /api/simulate');
    } catch (e) {
      logger.warn('Simulation routes not mounted:', e.message);
    }

    // Mount Sentiment API routes
    try {
      const sentimentRoutes = require('./src/routes/sentimentRoutes');
      app.use('/api/sentiment', sentimentRoutes);
      logger.info('🙂 Sentiment routes mounted at /api/sentiment');
    } catch (e) {
      logger.warn('Sentiment routes not mounted:', e.message);
    }

    // WebSocket handling is now managed by WebSocketService
    logger.info('🔌 WebSocket service initialized and handling connections');
    logger.info('⚔️  War Room sync service enabled with <300ms latency target');
    
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
    
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      try { await apolloServer.stop(); } catch {}
      try { await closeConnections(); } catch {}
      httpServer.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', async () => {
      await shutdown('SIGTERM');
    });
    process.on('SIGINT', async () => { await shutdown('SIGINT'); });
    
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
