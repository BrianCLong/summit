import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { readFileSync } from 'fs';
import { join } from 'path';
import winston from 'winston';
import pg from 'pg';

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Database connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err });
});

// Load GraphQL schema
const typeDefs = readFileSync(
  join(__dirname, 'graphql', 'schema.graphql'),
  'utf-8'
);

// GraphQL resolvers (simplified - full implementation would be in separate files)
const resolvers = {
  Query: {
    dashboard: async (_parent: any, { id }: { id: string }, context: any) => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM dashboards WHERE id = $1 AND deleted_at IS NULL',
          [id]
        );
        if (result.rows.length === 0) return null;

        const dashboard = result.rows[0];

        // Fetch widgets
        const widgetsResult = await client.query(
          'SELECT * FROM dashboard_widgets WHERE dashboard_id = $1 ORDER BY created_at',
          [id]
        );

        // Fetch filters
        const filtersResult = await client.query(
          'SELECT * FROM dashboard_filters WHERE dashboard_id = $1 ORDER BY created_at',
          [id]
        );

        return {
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          ownerId: dashboard.owner_id,
          isPublic: dashboard.is_public,
          widgets: widgetsResult.rows.map(w => ({
            id: w.id,
            dashboardId: w.dashboard_id,
            type: w.type.toUpperCase(),
            title: w.title,
            description: w.description,
            config: w.config,
            layout: w.layout,
            style: w.style,
            createdAt: w.created_at,
            updatedAt: w.updated_at,
          })),
          filters: filtersResult.rows.map(f => ({
            id: f.id,
            dashboardId: f.dashboard_id,
            field: f.field,
            label: f.label,
            type: f.type.toUpperCase(),
            options: f.options,
            defaultValue: f.default_value,
            createdAt: f.created_at,
          })),
          layout: dashboard.layout_config,
          theme: dashboard.theme,
          settings: dashboard.settings,
          permissions: {
            ownerId: dashboard.owner_id,
            isPublic: dashboard.is_public,
            sharedWith: [], // TODO: Fetch from dashboard_permissions
          },
          metadata: dashboard.metadata,
          createdAt: dashboard.created_at,
          updatedAt: dashboard.updated_at,
          deletedAt: dashboard.deleted_at,
        };
      } finally {
        client.release();
      }
    },

    dashboards: async (_parent: any, args: any, context: any) => {
      const client = await pool.connect();
      try {
        let query = 'SELECT * FROM dashboards WHERE deleted_at IS NULL';
        const params: any[] = [];
        let paramIndex = 1;

        if (args.ownerId) {
          query += ` AND owner_id = $${paramIndex}`;
          params.push(args.ownerId);
          paramIndex++;
        }

        if (args.isPublic !== undefined) {
          query += ` AND is_public = $${paramIndex}`;
          params.push(args.isPublic);
          paramIndex++;
        }

        if (args.search) {
          query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
          params.push(`%${args.search}%`);
          paramIndex++;
        }

        query += ' ORDER BY updated_at DESC';

        if (args.limit) {
          query += ` LIMIT $${paramIndex}`;
          params.push(args.limit);
          paramIndex++;
        }

        if (args.offset) {
          query += ` OFFSET $${paramIndex}`;
          params.push(args.offset);
        }

        const result = await client.query(query, params);

        return result.rows.map(dashboard => ({
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          ownerId: dashboard.owner_id,
          isPublic: dashboard.is_public,
          widgets: [], // Loaded separately if needed
          filters: [],
          layout: dashboard.layout_config,
          theme: dashboard.theme,
          settings: dashboard.settings,
          permissions: {
            ownerId: dashboard.owner_id,
            isPublic: dashboard.is_public,
            sharedWith: [],
          },
          metadata: dashboard.metadata,
          createdAt: dashboard.created_at,
          updatedAt: dashboard.updated_at,
          deletedAt: dashboard.deleted_at,
        }));
      } finally {
        client.release();
      }
    },
  },

  Mutation: {
    createDashboard: async (_parent: any, { input }: any, context: any) => {
      const client = await pool.connect();
      try {
        const userId = context.user?.id; // Assuming auth context
        if (!userId) throw new Error('Unauthorized');

        const result = await client.query(
          `INSERT INTO dashboards (name, description, owner_id, is_public, layout_config, theme, settings, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            input.name,
            input.description,
            userId,
            input.isPublic || false,
            input.layout || { cols: 12, rowHeight: 30, compactType: 'vertical', preventCollision: false },
            input.theme || null,
            input.settings || { autoRefresh: false, timezone: 'UTC', dateFormat: 'YYYY-MM-DD', numberFormat: '0,0.00' },
            input.metadata || { tags: [], version: 1 },
          ]
        );

        const dashboard = result.rows[0];

        return {
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          ownerId: dashboard.owner_id,
          isPublic: dashboard.is_public,
          widgets: [],
          filters: [],
          layout: dashboard.layout_config,
          theme: dashboard.theme,
          settings: dashboard.settings,
          permissions: {
            ownerId: dashboard.owner_id,
            isPublic: dashboard.is_public,
            sharedWith: [],
          },
          metadata: dashboard.metadata,
          createdAt: dashboard.created_at,
          updatedAt: dashboard.updated_at,
        };
      } finally {
        client.release();
      }
    },

    createWidget: async (_parent: any, { input }: any, context: any) => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `INSERT INTO dashboard_widgets (dashboard_id, type, title, description, config, layout, style)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            input.dashboardId,
            input.type.toLowerCase(),
            input.title,
            input.description,
            input.config,
            input.layout,
            input.style,
          ]
        );

        const widget = result.rows[0];

        return {
          id: widget.id,
          dashboardId: widget.dashboard_id,
          type: widget.type.toUpperCase(),
          title: widget.title,
          description: widget.description,
          config: widget.config,
          layout: widget.layout,
          style: widget.style,
          createdAt: widget.created_at,
          updatedAt: widget.updated_at,
        };
      } finally {
        client.release();
      }
    },
  },
};

// Context function for authentication
interface Context {
  user?: { id: string; username: string; email: string };
}

async function getContext({ req }: { req: express.Request }): Promise<Context> {
  // TODO: Implement proper JWT authentication
  // For now, return mock context
  return {
    user: {
      id: 'mock-user-id',
      username: 'mockuser',
      email: 'mock@example.com',
    },
  };
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // Security and compression middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));
  app.use(compression());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  // Apollo Server setup
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: getContext,
    })
  );

  // Socket.IO setup for real-time features
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id });

    // Join dashboard room for real-time updates
    socket.on('join-dashboard', (dashboardId: string) => {
      socket.join(`dashboard:${dashboardId}`);
      logger.info('Client joined dashboard room', { socketId: socket.id, dashboardId });
    });

    // Leave dashboard room
    socket.on('leave-dashboard', (dashboardId: string) => {
      socket.leave(`dashboard:${dashboardId}`);
      logger.info('Client left dashboard room', { socketId: socket.id, dashboardId });
    });

    // Broadcast widget updates
    socket.on('widget-updated', (data: { dashboardId: string; widgetId: string; changes: any }) => {
      socket.to(`dashboard:${data.dashboardId}`).emit('widget-updated', data);
    });

    socket.on('disconnect', () => {
      logger.info('Client disconnected', { socketId: socket.id });
    });
  });

  // Health check endpoint
  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'healthy', service: 'dashboard-service' });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(503).json({ status: 'unhealthy', service: 'dashboard-service' });
    }
  });

  const port = process.env.PORT || 4001;

  httpServer.listen(port, () => {
    logger.info(`Dashboard service started`, {
      port,
      graphql: `/graphql`,
      environment: process.env.NODE_ENV || 'development',
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
