"use strict";
/**
 * Structured Logging with Pino
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createChildLogger = createChildLogger;
const pino_1 = __importDefault(require("pino"));
const isDev = process.env.NODE_ENV === 'development';
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: isDev ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
        },
    } : undefined,
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    base: {
        service: 'websocket-server',
        nodeId: process.env.NODE_ID || 'unknown',
    },
});
function createChildLogger(context) {
    return exports.logger.child(context);
}
