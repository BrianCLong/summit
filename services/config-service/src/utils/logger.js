"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createChildLogger = createChildLogger;
const winston_1 = __importDefault(require("winston"));
const isDev = process.env.NODE_ENV === 'development';
const winstonLogger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), isDev
        ? winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        : winston_1.default.format.json()),
    defaultMeta: { service: 'config-service' },
    transports: [
        new winston_1.default.transports.Console(),
        ...(isDev
            ? []
            : [
                new winston_1.default.transports.File({
                    filename: 'error.log',
                    level: 'error',
                }),
                new winston_1.default.transports.File({ filename: 'combined.log' }),
            ]),
    ],
});
function createLogger(baseLogger, baseMeta = {}) {
    const log = (level, args) => {
        if (args.length === 1 && typeof args[0] === 'string') {
            baseLogger.log(level, args[0], baseMeta);
        }
        else if (args.length === 2 && typeof args[0] === 'object' && typeof args[1] === 'string') {
            baseLogger.log(level, args[1], { ...baseMeta, ...args[0] });
        }
        else {
            baseLogger.log(level, String(args[0]), baseMeta);
        }
    };
    return {
        info: (...args) => log('info', args),
        warn: (...args) => log('warn', args),
        error: (...args) => log('error', args),
        debug: (...args) => log('debug', args),
        child: (meta) => createLogger(baseLogger, { ...baseMeta, ...meta }),
    };
}
exports.logger = createLogger(winstonLogger);
function createChildLogger(meta) {
    return exports.logger.child(meta);
}
