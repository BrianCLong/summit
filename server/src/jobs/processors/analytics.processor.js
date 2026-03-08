"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsProcessor = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const analyticsProcessor = async (job) => {
    logger_js_1.default.info(`Running analytics for job ${job.id}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    logger_js_1.default.info(`Analytics run completed for job ${job.id}`);
    return { metrics: { cpu: 0.5, memory: 0.8 } };
};
exports.analyticsProcessor = analyticsProcessor;
