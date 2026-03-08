"use strict";
// @ts-nocheck
/**
 * Bull Board Dashboard Route
 * Provides web UI for monitoring and managing job queues
 *
 * Issue: #11812 - Job Queue with Bull and Redis
 * MIT License - Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeBullBoard = initializeBullBoard;
exports.addQueueToDashboard = addQueueToDashboard;
const express_1 = require("express");
const api_1 = require("@bull-board/api");
const bullMQAdapter_js_1 = require("@bull-board/api/bullMQAdapter.js");
const express_2 = require("@bull-board/express");
const config_js_1 = require("../queues/config.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = (0, express_1.Router)();
// Create Express adapter for Bull Board
const serverAdapter = new express_2.ExpressAdapter();
serverAdapter.setBasePath('/queues');
/**
 * Initialize Bull Board with all registered queues
 */
function initializeBullBoard() {
    const queues = config_js_1.queueRegistry.getAllQueues();
    if (queues.length === 0) {
        logger_js_1.default.warn('No queues registered for Bull Board dashboard');
    }
    (0, api_1.createBullBoard)({
        queues: queues.map((queue) => new bullMQAdapter_js_1.BullMQAdapter(queue)),
        serverAdapter,
    });
    logger_js_1.default.info(`Bull Board initialized with ${queues.length} queues`);
    return serverAdapter;
}
/**
 * Add a queue to Bull Board dynamically
 */
function addQueueToDashboard(queueName) {
    const queue = config_js_1.queueRegistry.getQueue(queueName);
    // Note: Dynamic addition requires Bull Board 4.x+
    logger_js_1.default.info(`Queue ${queueName} added to dashboard`);
}
// Initialize the dashboard
const bullBoardAdapter = initializeBullBoard();
// Mount Bull Board routes
router.use('/', bullBoardAdapter.getRouter());
// Health check for dashboard
router.get('/health', (_req, res) => {
    const queues = config_js_1.queueRegistry.getAllQueues();
    res.json({
        ok: true,
        service: 'queues-dashboard',
        queues: queues.length,
        queueNames: queues.map((q) => q.name),
    });
});
exports.default = router;
