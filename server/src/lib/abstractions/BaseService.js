"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const metrics_js_1 = require("../../utils/metrics.js");
/**
 * BaseService: The canonical abstraction for all domain services.
 * Enforces consistent logging, metrics, and health checks.
 */
class BaseService {
    config;
    logger;
    metrics;
    serviceName;
    constructor(serviceName, config) {
        this.serviceName = serviceName;
        this.config = config;
        this.logger = logger_js_1.default.child({ service: serviceName });
        // Normalize service name for metrics (e.g. 'AuthService' -> 'auth')
        const metricName = serviceName.toLowerCase().replace(/service$/i, '');
        this.metrics = new metrics_js_1.PrometheusMetrics(metricName);
    }
    /**
     * Standardized error logging helper.
     */
    logError(message, error, context = {}) {
        const errObj = error instanceof Error ? { stack: error.stack, ...error } : { message: String(error) };
        this.logger.error({ err: errObj, ...context }, message);
    }
}
exports.BaseService = BaseService;
