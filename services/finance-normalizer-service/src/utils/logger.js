"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const devFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'HH:mm:ss.SSS' }), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
}));
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? logFormat : devFormat,
    defaultMeta: { service: 'finance-normalizer-service' },
    transports: [
        new winston_1.default.transports.Console(),
    ],
});
// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
    }));
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        maxsize: 10485760,
        maxFiles: 5,
    }));
}
