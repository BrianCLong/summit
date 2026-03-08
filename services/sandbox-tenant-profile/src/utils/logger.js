"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const baseLogger = (0, pino_1.default)({
    name: 'sandbox-tenant-profile',
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
            },
        }
        : undefined,
});
exports.logger = baseLogger;
function createLogger(component) {
    return baseLogger.child({ component });
}
