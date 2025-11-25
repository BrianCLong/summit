/**
 * Notification Router Service Entry Point
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { NotificationRouter } from './notification-router.js';
import { EmailDelivery } from './delivery-channels/email-delivery.js';
import { SlackDelivery } from './delivery-channels/slack-delivery.js';
import {
  WebSocketDelivery,
  InMemoryWebSocketManager,
} from './delivery-channels/websocket-delivery.js';

// Load environment variables
dotenv.config();

async function main() {
  console.log('[NotificationRouter] Initializing...');

  // Database connection
  const db = new Pool({
    connectionString:
      process.env.DATABASE_URL || 'postgresql://localhost:5432/intelgraph',
  });

  // Redis connection
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  // Initialize delivery channels
  const emailDelivery = process.env.SMTP_HOST
    ? new EmailDelivery({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD || '',
            }
          : undefined,
        from: process.env.SMTP_FROM || 'notifications@intelgraph.io',
      })
    : undefined;

  const slackDelivery = process.env.SLACK_BOT_TOKEN
    ? new SlackDelivery({
        botToken: process.env.SLACK_BOT_TOKEN,
        defaultWebhookUrl: process.env.SLACK_DEFAULT_WEBHOOK_URL,
      })
    : undefined;

  // For now, use in-memory WebSocket manager (in production, use Socket.IO)
  const wsManager = new InMemoryWebSocketManager();
  const websocketDelivery = new WebSocketDelivery(wsManager);

  // Initialize router
  const router = new NotificationRouter({
    database: db,
    redis,
    emailDelivery,
    slackDelivery,
    websocketDelivery,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    enableAutoRouting: process.env.ENABLE_AUTO_ROUTING !== 'false',
  });

  // Start router
  await router.start();

  // Health check endpoint (if running as standalone service)
  const port = parseInt(process.env.PORT || '3003', 10);
  const express = require('express');
  const app = express();

  app.get('/health', async (req: any, res: any) => {
    const channelHealth = await router.healthCheck();
    const stats = router.getStats();

    res.json({
      status: 'healthy',
      channels: channelHealth,
      stats,
    });
  });

  app.listen(port, () => {
    console.log(`[NotificationRouter] Health endpoint listening on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[NotificationRouter] SIGTERM received, shutting down gracefully...');
    await router.stop();
    await db.end();
    await redis.quit();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[NotificationRouter] SIGINT received, shutting down gracefully...');
    await router.stop();
    await db.end();
    await redis.quit();
    process.exit(0);
  });

  console.log('[NotificationRouter] Running');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[NotificationRouter] Fatal error:', error);
    process.exit(1);
  });
}

export { NotificationRouter };
export * from './types.js';
export * from './severity-calculator.js';
export * from './notification-throttler.js';
export * from './delivery-channels/base-delivery.js';
export * from './delivery-channels/websocket-delivery.js';
export * from './delivery-channels/email-delivery.js';
export * from './delivery-channels/slack-delivery.js';
