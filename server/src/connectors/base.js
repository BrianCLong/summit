"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseConnector = exports.BaseSourceConnector = void 0;
// @ts-nocheck
const events_1 = require("events");
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
class BaseSourceConnector {
    handleError(ctx, error) {
        const err = error instanceof Error ? error : new Error(String(error));
        ctx.logger.error({ error: err }, 'Connector operation failed');
    }
}
exports.BaseSourceConnector = BaseSourceConnector;
class BaseConnector extends events_1.EventEmitter {
    config;
    metrics;
    isConnected = false;
    logger;
    constructor(config) {
        super();
        this.config = config;
        this.metrics = {
            recordsProcessed: 0,
            bytesProcessed: 0,
            errors: 0,
            latency: 0
        };
        this.logger = logger_js_1.default.child({
            connectorId: config.id,
            connectorType: config.type,
            tenantId: config.tenantId
        });
    }
    /**
     * Rate limiting helper
     * Basic token bucket implementation or delay
     */
    async throttle() {
        // Simple delay for now to prevent overwhelming sources
        // In production this would be a real rate limiter
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    /**
     * Write data to the source (Bi-directional support)
     */
    async writeRecords(_records) {
        throw new Error(`writeRecords is not implemented for connector type "${this.config.type}"`);
    }
    /**
     * Check the health of the connector
     */
    async healthCheck() {
        try {
            const start = Date.now();
            const connected = await this.testConnection();
            const latency = Date.now() - start;
            return {
                status: connected ? 'healthy' : 'unhealthy',
                latencyMs: latency,
                timestamp: new Date()
            };
        }
        catch (err) {
            return {
                status: 'unhealthy',
                error: err instanceof Error ? err.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }
    /**
     * Validate configuration
     */
    validateConfig() {
        return !!this.config.id && !!this.config.type;
    }
    /**
     * Wrap data in a standard ingestion event structure with provenance
     */
    wrapEvent(data) {
        const lineageId = (0, crypto_1.randomUUID)();
        const consent = this.config.metadata?.consent;
        const termsUrl = this.config.metadata?.termsUrl;
        return {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sourceId: this.config.id,
            timestamp: new Date(),
            data,
            metadata: {
                consent,
                termsUrl
            },
            provenance: {
                source: this.config.name,
                sourceId: this.config.id,
                ingestTimestamp: new Date(),
                connectorType: this.config.type,
                lineageId,
                consent,
                termsUrl
            }
        };
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
}
exports.BaseConnector = BaseConnector;
