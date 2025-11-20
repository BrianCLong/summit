import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import pino from 'pino';
import pinoHttp from 'pino-http';
import cors from 'cors';
import { EventBus } from './event-bus.js';
import { EventStore } from './event-store.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const eventBus = new EventBus(logger);
const eventStore = new EventStore();

export async function createApp() {
  const app = express();
  const server = createServer(app);

  // WebSocket server for real-time events
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Middleware
  app.use(express.json());
  app.use(cors());
  app.use(pinoHttp({ logger }));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'supply-chain-events',
      timestamp: new Date().toISOString(),
      connections: wss.clients.size,
    });
  });

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = crypto.randomUUID();
    logger.info({ clientId, ip: req.socket.remoteAddress }, 'WebSocket client connected');

    // Subscribe to all events by default
    const subscriptions = new Set<string>(['*']);

    // Handle messages from client
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'subscribe') {
          const { topics } = message;
          topics.forEach((topic: string) => subscriptions.add(topic));
          ws.send(JSON.stringify({
            type: 'subscribed',
            topics: Array.from(subscriptions),
          }));
        } else if (message.type === 'unsubscribe') {
          const { topics } = message;
          topics.forEach((topic: string) => subscriptions.delete(topic));
          ws.send(JSON.stringify({
            type: 'unsubscribed',
            topics,
          }));
        } else if (message.type === 'publish') {
          // Allow clients to publish events
          eventBus.publish(message.topic, message.data);
        }
      } catch (error) {
        logger.error({ error, clientId }, 'Error processing WebSocket message');
      }
    });

    // Subscribe to event bus
    const unsubscribe = eventBus.subscribe('*', (topic, data) => {
      // Check if client is subscribed to this topic
      if (subscriptions.has('*') || subscriptions.has(topic)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'event',
            topic,
            data,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    });

    ws.on('close', () => {
      logger.info({ clientId }, 'WebSocket client disconnected');
      unsubscribe();
    });

    ws.on('error', (error) => {
      logger.error({ error, clientId }, 'WebSocket error');
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to Supply Chain Events',
    }));
  });

  // REST API for events

  // Publish event
  app.post('/api/events/publish', (req: Request, res: Response) => {
    const { topic, data } = req.body;

    if (!topic || !data) {
      return res.status(400).json({ error: 'topic and data required' });
    }

    const event = {
      id: crypto.randomUUID(),
      topic,
      data,
      timestamp: new Date(),
    };

    eventBus.publish(topic, data);
    eventStore.store(event);

    res.status(201).json(event);
  });

  // Get event history
  app.get('/api/events', (req: Request, res: Response) => {
    const { topic, since, limit } = req.query;

    let events = eventStore.query({
      topic: topic as string,
      since: since ? new Date(since as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
    });

    res.json({ events, total: events.length });
  });

  // Get event by ID
  app.get('/api/events/:id', (req: Request, res: Response) => {
    const event = eventStore.getById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  });

  // Event statistics
  app.get('/api/events/stats', (req: Request, res: Response) => {
    const stats = eventStore.getStatistics();
    res.json(stats);
  });

  return { app, server };
}

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  createApp().then(({ server }) => {
    const port = process.env.PORT || 4022;
    server.listen(port, () => {
      logger.info(`Supply Chain Events Service listening on port ${port}`);
      logger.info(`WebSocket endpoint: ws://localhost:${port}/ws`);
    });
  });
}
