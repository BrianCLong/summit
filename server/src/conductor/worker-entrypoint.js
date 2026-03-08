#!/usr/bin/env node
"use strict";
// Worker Entrypoint for Conductor Queue Processing
// Used in Kubernetes deployments to start queue workers
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const queue_worker_js_1 = require("./scheduling/queue-worker.js");
const prometheus_js_1 = require("./observability/prometheus.js");
const express_1 = __importDefault(require("express"));
const metrics_js_1 = require("../monitoring/metrics.js");
const startup_readiness_js_1 = require("../utils/startup-readiness.js");
const redis_js_1 = require("../db/redis.js");
/**
 * Worker application setup
 */
async function startWorker() {
    const role = process.env.CONDUCTOR_ROLE || 'worker';
    const expertType = process.env.EXPERT_TYPE;
    let ready = false;
    console.log(`Starting Conductor ${role}${expertType ? ` for ${expertType}` : ''}`);
    console.log('Environment:', {
        CONDUCTOR_ROLE: process.env.CONDUCTOR_ROLE,
        EXPERT_TYPE: process.env.EXPERT_TYPE,
        QUEUE_NAMES: process.env.QUEUE_NAMES,
        WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
        REDIS_URL: process.env.REDIS_URL ? '[REDACTED]' : 'undefined',
        NODE_ENV: process.env.NODE_ENV,
    });
    if (role === 'api') {
        // Start the main API server
        const { createApp } = await Promise.resolve().then(() => __importStar(require('../app.js')));
        const app = await createApp();
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Conductor API server listening on port ${port}`);
        });
        return;
    }
    // Start worker process
    let worker;
    await (0, startup_readiness_js_1.verifyStartupDependencies)();
    if (expertType && expertType !== 'light') {
        // Specific expert worker
        worker = queue_worker_js_1.WorkerFactory.createExpertWorker(expertType);
    }
    else {
        // Light task worker pool
        worker = queue_worker_js_1.WorkerFactory.createLightWorker();
    }
    // Create minimal express app for worker health checks and metrics
    const workerApp = (0, express_1.default)();
    const port = process.env.WORKER_PORT || 8080;
    // Health check endpoint
    workerApp.get('/health', (req, res) => {
        const status = worker.getStatus();
        res.json({
            success: true,
            status: status.isRunning ? 'running' : 'stopped',
            worker: status,
            timestamp: Date.now(),
        });
    });
    // Readiness probe ensuring queue is live and dependencies respond
    workerApp.get('/ready', async (_req, res) => {
        const status = worker.getStatus();
        try {
            const redis = (0, redis_js_1.getRedisClient)();
            await redis.ping();
        }
        catch (error) {
            return res.status(503).json({
                success: false,
                status: 'not ready',
                reason: error instanceof Error ? error.message : 'Redis unavailable',
            });
        }
        if (!ready || !status.isRunning) {
            return res.status(503).json({
                success: false,
                status: 'starting',
                worker: status,
            });
        }
        return res.json({
            success: true,
            status: 'ready',
            worker: status,
        });
    });
    // Metrics endpoint
    workerApp.get('/metrics', async (req, res) => {
        res.set('Content-Type', metrics_js_1.register.contentType);
        res.end(await metrics_js_1.register.metrics());
    });
    // Worker status endpoint
    workerApp.get('/status', (req, res) => {
        const status = worker.getStatus();
        res.json({
            success: true,
            worker: status,
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            timestamp: Date.now(),
        });
    });
    // Start worker HTTP server for health checks
    workerApp.listen(port, () => {
        console.log(`Worker health server listening on port ${port}`);
    });
    // Start the actual worker
    await worker.start();
    ready = true;
    console.log(`Worker ${worker.getStatus().workerId} started successfully`);
    // Keep process alive
    process.on('SIGTERM', async () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        await worker.shutdown();
        process.exit(0);
    });
    process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await worker.shutdown();
        process.exit(0);
    });
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('worker_uncaught_exception', { success: false });
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('worker_unhandled_rejection', { success: false });
    });
}
// Start the worker
startWorker().catch((error) => {
    console.error('Failed to start worker:', error);
    process.exit(1);
});
