/**
 * WebSocket Server Entry Point
 * High-availability WebSocket infrastructure for Summit platform
 */

import 'dotenv/config';
import { WebSocketServer } from './server.js';
import { loadConfig } from './utils/config.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // Load configuration
    const config = loadConfig();

    logger.info(
      {
        nodeId: config.clustering.nodeId,
        port: config.port,
        clustering: config.clustering.enabled,
        persistence: config.persistence.enabled,
      },
      'Starting WebSocket server...'
    );

    // Create and start server
    const server = new WebSocketServer(config);
    await server.start();

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');

      try {
        await server.stop();
        process.exit(0);
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
      shutdown('uncaughtException');
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, 'Unhandled rejection');
      shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to start server');
    process.exit(1);
  }
}

main();
