"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionProcessor = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const ingestionProcessor = async (job) => {
    logger_js_1.default.info(`Starting ingestion job ${job.id}`);
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (Math.random() < 0.1) {
        throw new Error("Random ingestion failure");
    }
    logger_js_1.default.info(`Ingestion job ${job.id} completed`, job.data);
    return { processed: true, count: 100 };
};
exports.ingestionProcessor = ingestionProcessor;
