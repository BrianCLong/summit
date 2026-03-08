"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
            timestamp,
            level,
            message,
            service: 'active-measures',
            ...meta,
        });
    })),
    defaultMeta: {
        service: 'active-measures-module',
        classification: 'CONFIDENTIAL',
    },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
        new winston_1.default.transports.File({
            filename: 'logs/active-measures-error.log',
            level: 'error',
        }),
        new winston_1.default.transports.File({
            filename: 'logs/active-measures-combined.log',
        }),
    ],
});
// In production, log to remote logging service
if (process.env.NODE_ENV === 'production') {
    // Add remote logging transport here (e.g., CloudWatch, Elasticsearch)
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.json(),
    }));
}
exports.default = logger;
