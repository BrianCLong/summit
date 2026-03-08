"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
    }
    return log;
}));
exports.logger = winston_1.default.createLogger({
    level: config_1.config.monitoring.logLevel,
    format: logFormat,
    defaultMeta: { service: 'graph-analytics' },
    transports: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        new winston_1.default.transports.File({
            filename: 'logs/graph-analytics-error.log',
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }),
        new winston_1.default.transports.File({
            filename: 'logs/graph-analytics-combined.log',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }),
    ],
});
// Performance logging helper
exports.performanceLogger = {
    start: (operation) => {
        if (config_1.config.monitoring.enablePerformanceLogging) {
            const startTime = process.hrtime.bigint();
            return {
                end: () => {
                    const endTime = process.hrtime.bigint();
                    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                    exports.logger.info(`Performance: ${operation} completed in ${duration.toFixed(2)}ms`);
                },
            };
        }
        return { end: () => { } };
    },
};
// Create logs directory if it doesn't exist
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
