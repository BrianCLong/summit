"use strict";
/**
 * Logger utility for Resilient Orchestrator
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize, json } = winston_1.default.format;
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let metaStr = '';
    if (Object.keys(metadata).length > 0) {
        metaStr = ` ${JSON.stringify(metadata)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
});
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    defaultMeta: { service: 'resilient-orchestrator' },
    transports: [
        new winston_1.default.transports.Console({
            format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), consoleFormat),
        }),
    ],
});
// Add file transport in production
if (process.env.NODE_ENV === 'production') {
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }));
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/combined.log',
    }));
}
