"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentLogger = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
exports.logger = (0, pino_1.default)({
    name: 'regulatory-compliance-agents',
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
});
const createAgentLogger = (agentName) => exports.logger.child({ agent: agentName });
exports.createAgentLogger = createAgentLogger;
