"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportProcessor = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const reportProcessor = async (job) => {
    logger_js_1.default.info(`Generating report for job ${job.id}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    logger_js_1.default.info(`Report generated for job ${job.id}`);
    return { reportUrl: `https://example.com/reports/${job.id}.pdf` };
};
exports.reportProcessor = reportProcessor;
