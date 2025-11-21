import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { CollaborationHub } from '@intelgraph/collaboration';
import { InMemoryStores } from './stores';
import { setupRoutes } from './routes';
import { WebSocketHandler } from './websocket';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3010;
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const fastify = Fastify({
    logger: true
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  await fastify.register(websocket);

  // Initialize stores (using in-memory for now, would use DB in production)
  const stores = new InMemoryStores();

  // Initialize collaboration hub
  const hub = new CollaborationHub(stores);

  // Setup REST API routes
  setupRoutes(fastify, hub);

  // Setup WebSocket handler for real-time sync
  const wsHandler = new WebSocketHandler(hub);
  fastify.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, wsHandler.handleConnection.bind(wsHandler));
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Collaboration service listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
