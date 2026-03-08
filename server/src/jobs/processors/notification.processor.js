"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationProcessor = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const notificationProcessor = async (job) => {
    logger_js_1.default.info(`Sending notification for job ${job.id} to ${job.data.to}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
    logger_js_1.default.info(`Notification sent for job ${job.id}`);
    return { sent: true };
};
exports.notificationProcessor = notificationProcessor;
