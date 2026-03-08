"use strict";
/**
 * Logger utility for Model Hub Service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createChildLogger = createChildLogger;
const pino_1 = __importDefault(require("pino"));
const isDevelopment = process.env.NODE_ENV !== 'production';
exports.logger = (0, pino_1.default)({
    name: 'model-hub-service',
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    formatters: {
        level: (label) => ({ level: label }),
    },
    base: {
        service: 'model-hub-service',
        version: process.env.npm_package_version || '1.0.0',
    },
});
function createChildLogger(context) {
    return exports.logger.child(context);
}
