"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
class Logger {
    context;
    logger;
    constructor(context) {
        this.context = context;
        this.logger = winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            defaultMeta: { service: 'queue-manager', context },
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, context, ...meta }) => {
                        const metaStr = Object.keys(meta).length > 0
                            ? ` ${JSON.stringify(meta)}`
                            : '';
                        return `${timestamp} [${context}] ${level}: ${message}${metaStr}`;
                    })),
                }),
            ],
        });
        // Add file transport in production
        if (process.env.NODE_ENV === 'production') {
            this.logger.add(new winston_1.default.transports.File({
                filename: 'logs/queue-manager-error.log',
                level: 'error',
            }));
            this.logger.add(new winston_1.default.transports.File({
                filename: 'logs/queue-manager-combined.log',
            }));
        }
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    error(message, error) {
        this.logger.error(message, { error: error?.stack || error });
    }
}
exports.Logger = Logger;
