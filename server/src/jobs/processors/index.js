"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeProcessors = initializeProcessors;
const worker_js_1 = require("../../queue/worker.js");
const types_js_1 = require("../../queue/types.js");
const retentionProcessor_js_1 = require("./retentionProcessor.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'processors-init' });
function initializeProcessors() {
    logger.info('Initializing job processors...');
    worker_js_1.workerManager.registerWorker(types_js_1.QueueName.RETENTION, retentionProcessor_js_1.retentionProcessor);
    logger.info('Job processors initialized.');
}
