"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolbus = exports.ToolbusService = exports.SimpleRateLimiter = exports.ToolbusExecutionError = void 0;
const logger_js_1 = require("../utils/logger.js");
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default();
class ToolbusExecutionError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'ToolbusExecutionError';
    }
}
exports.ToolbusExecutionError = ToolbusExecutionError;
class SimpleRateLimiter {
    requestsPerMinute;
    burstLimit;
    lastRequest = 0;
    tokens;
    constructor(requestsPerMinute, burstLimit) {
        this.requestsPerMinute = requestsPerMinute;
        this.burstLimit = burstLimit;
        this.tokens = burstLimit;
    }
    async acquire() {
        this.refill();
        if (this.tokens < 1) {
            const waitTime = (60000 / this.requestsPerMinute);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.refill();
        }
        this.tokens -= 1;
    }
    isLimited() {
        this.refill();
        return this.tokens < 1;
    }
    remaining() {
        this.refill();
        return Math.floor(this.tokens);
    }
    refill() {
        const now = Date.now();
        const elapsed = now - this.lastRequest;
        // Simple token bucket refill
        const newTokens = (elapsed / 60000) * this.requestsPerMinute;
        this.tokens = Math.min(this.burstLimit, this.tokens + newTokens);
        this.lastRequest = now;
    }
}
exports.SimpleRateLimiter = SimpleRateLimiter;
class ToolbusService {
    connectors = new Map();
    rateLimiters = new Map();
    constructor() {
        logger_js_1.logger.info('ToolbusService initialized');
    }
    registerConnector(connector) {
        this.connectors.set(connector.manifest.id, connector);
        // Initialize rate limiter if configured
        if (connector.manifest.rateLimit) {
            this.rateLimiters.set(connector.manifest.id, new SimpleRateLimiter(connector.manifest.rateLimit.requestsPerMinute, connector.manifest.rateLimit.burstLimit));
        }
        logger_js_1.logger.info({ connectorId: connector.manifest.id }, 'Connector registered');
    }
    async executeTool(connectorId, actionName, params, context) {
        const connector = this.connectors.get(connectorId);
        if (!connector) {
            throw new ToolbusExecutionError(`Connector ${connectorId} not found`, 'CONNECTOR_NOT_FOUND');
        }
        // Check capability
        if (!connector.manifest.capabilities.includes('action')) {
            throw new ToolbusExecutionError(`Connector ${connectorId} does not support actions`, 'CAPABILITY_MISSING');
        }
        if (!connector.execute) {
            throw new ToolbusExecutionError(`Connector ${connectorId} has no execute method`, 'IMPLEMENTATION_MISSING');
        }
        // Rate Limiting
        const limiter = this.rateLimiters.get(connectorId);
        if (limiter) {
            await limiter.acquire();
        }
        // Validation
        const actions = connector.getActions ? await connector.getActions() : [];
        const actionDef = actions.find(a => a.name === actionName);
        if (actionDef && actionDef.inputSchema) {
            const validate = ajv.compile(actionDef.inputSchema);
            if (!validate(params)) {
                throw new ToolbusExecutionError(`Invalid parameters: ${ajv.errorsText(validate.errors)}`, 'INVALID_PARAMS');
            }
        }
        else {
            // Warning if action definition not found but trying to execute anyway?
            // Or strict mode? strict mode is safer.
            // But for MVP if getActions is missing we might skip validation.
            logger_js_1.logger.warn({ connectorId, actionName }, 'Action definition not found or getActions not implemented, skipping schema validation');
        }
        // Execution with Retry (Exponential Backoff)
        let attempt = 0;
        const maxRetries = 3;
        let lastError;
        while (attempt <= maxRetries) {
            try {
                const fullContext = {
                    logger: context.logger, // Cast or provide default
                    metrics: context.metrics,
                    rateLimiter: limiter || new SimpleRateLimiter(100, 10),
                    stateStore: context.stateStore,
                    emitter: context.emitter,
                    signal: context.signal || new AbortController().signal
                };
                // SANDBOXING:
                // In a real implementation, this would run in a separate process or isolate.
                // Here we just wrap in a try-catch and maybe a timeout promise.
                return await Promise.race([
                    connector.execute(actionName, params, fullContext),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Tool execution timed out')), 30000))
                ]);
            }
            catch (error) {
                lastError = error;
                // Check if retryable
                // Assuming error might have property 'retryable' or we decide based on type
                // BaseConnector wraps errors in ConnectorResult if it fails inside, but here we might catch thrown errors
                const isRetryable = error.retryable || error.message.includes('timeout') || error.code === 'ECONNRESET';
                if (!isRetryable || attempt === maxRetries) {
                    throw new ToolbusExecutionError(`Execution failed: ${error.message}`, 'EXECUTION_FAILED');
                }
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
                logger_js_1.logger.warn({ connectorId, actionName, attempt, error: error.message }, 'Retrying tool execution');
            }
        }
        throw new ToolbusExecutionError('Max retries exceeded', 'MAX_RETRIES');
    }
}
exports.ToolbusService = ToolbusService;
exports.toolbus = new ToolbusService();
