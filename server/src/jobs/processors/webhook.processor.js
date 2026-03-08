"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookProcessor = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const webhookProcessor = async (job) => {
    logger_js_1.default.info(`Processing webhook ${job.id}`);
    // Logic to handle webhook
    logger_js_1.default.info(`Webhook payload:`, job.data);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { status: 'processed' };
};
exports.webhookProcessor = webhookProcessor;
