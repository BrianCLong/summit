"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.perfTrace = perfTrace;
const perf_hooks_1 = require("perf_hooks");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'perfTrace' });
function perfTrace(req, res, next) {
    const start = perf_hooks_1.performance.now();
    res.on('finish', () => {
        const duration = perf_hooks_1.performance.now() - start;
        logger.info({ path: req.path, duration }, 'request completed');
    });
    next();
}
