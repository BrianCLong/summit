"use strict";
/**
 * Notification Router Service Entry Point
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRouter = void 0;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
const notification_router_js_1 = require("./notification-router.js");
Object.defineProperty(exports, "NotificationRouter", { enumerable: true, get: function () { return notification_router_js_1.NotificationRouter; } });
const email_delivery_js_1 = require("./delivery-channels/email-delivery.js");
const slack_delivery_js_1 = require("./delivery-channels/slack-delivery.js");
const websocket_delivery_js_1 = require("./delivery-channels/websocket-delivery.js");
// Load environment variables
dotenv_1.default.config();
async function main() {
    console.log('[NotificationRouter] Initializing...');
    // Database connection
    const db = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/intelgraph',
    });
    // Redis connection
    const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
    // Initialize delivery channels
    const emailDelivery = process.env.SMTP_HOST
        ? new email_delivery_js_1.EmailDelivery({
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
        ? new slack_delivery_js_1.SlackDelivery({
            botToken: process.env.SLACK_BOT_TOKEN,
            defaultWebhookUrl: process.env.SLACK_DEFAULT_WEBHOOK_URL,
        })
        : undefined;
    // For now, use in-memory WebSocket manager (in production, use Socket.IO)
    const wsManager = new websocket_delivery_js_1.InMemoryWebSocketManager();
    const websocketDelivery = new websocket_delivery_js_1.WebSocketDelivery(wsManager);
    // Initialize router
    const router = new notification_router_js_1.NotificationRouter({
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
    app.get('/health', async (req, res) => {
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
__exportStar(require("./types.js"), exports);
__exportStar(require("./severity-calculator.js"), exports);
__exportStar(require("./notification-throttler.js"), exports);
__exportStar(require("./delivery-channels/base-delivery.js"), exports);
__exportStar(require("./delivery-channels/websocket-delivery.js"), exports);
__exportStar(require("./delivery-channels/email-delivery.js"), exports);
__exportStar(require("./delivery-channels/slack-delivery.js"), exports);
