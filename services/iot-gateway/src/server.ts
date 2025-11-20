/**
 * IoT Gateway Service
 * Main entry point for IoT device connectivity and data routing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { config } from 'dotenv';
import { setupRoutes } from './routes/index.js';
import { IoTGatewayApp } from './app.js';

config();

const logger = pino({ name: 'iot-gateway' });
const app = express();
const port = process.env.IOT_GATEWAY_PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

// Initialize IoT Gateway
const gatewayApp = new IoTGatewayApp();

// Setup routes
setupRoutes(app, gatewayApp);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'iot-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ error: err }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
async function start() {
  try {
    await gatewayApp.initialize();

    app.listen(port, () => {
      logger.info({ port }, 'IoT Gateway service started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start IoT Gateway');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await gatewayApp.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await gatewayApp.shutdown();
  process.exit(0);
});

start();
