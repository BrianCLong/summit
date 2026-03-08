"use strict";
/**
 * HTTP Connector
 *
 * A connector that receives signals via HTTP webhooks.
 * Useful for integrating with external systems that can push data.
 *
 * @module http-connector
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpConnector = void 0;
exports.createHttpConnector = createHttpConnector;
const base_connector_js_1 = require("./base-connector.js");
/**
 * HTTP Connector class
 */
class HttpConnector extends base_connector_js_1.BaseConnector {
    httpConfig;
    isListening = false;
    constructor(config, logger) {
        super(config, logger);
        this.httpConfig = config;
    }
    /**
     * Connect (mark as ready to receive)
     */
    async doConnect() {
        this.isListening = true;
        this.logger.info({ webhookPath: this.httpConfig.webhookPath }, 'HTTP connector ready');
    }
    /**
     * Disconnect
     */
    async doDisconnect() {
        this.isListening = false;
        this.logger.info('HTTP connector stopped');
    }
    /**
     * Check health
     */
    async checkHealth() {
        return this.isListening;
    }
    /**
     * Handle incoming webhook data
     */
    handleWebhook(data, headers) {
        if (!this.isListening) {
            return { success: false, signalCount: 0, error: 'Connector not listening' };
        }
        // Validate auth token if configured
        if (this.httpConfig.authToken) {
            const authHeader = headers?.['authorization'] ?? headers?.['Authorization'];
            if (authHeader !== `Bearer ${this.httpConfig.authToken}`) {
                return { success: false, signalCount: 0, error: 'Unauthorized' };
            }
        }
        try {
            // Transform the data
            let signals;
            if (this.httpConfig.transform) {
                const transformed = this.httpConfig.transform(data);
                if (!transformed) {
                    return { success: true, signalCount: 0 };
                }
                signals = Array.isArray(transformed) ? transformed : [transformed];
            }
            else {
                // Default transformation assumes data is already in RawSignalInput format
                signals = Array.isArray(data) ? data : [data];
            }
            // Emit each signal
            for (const signal of signals) {
                this.emitSignal({
                    ...signal,
                    tenantId: signal.tenantId ?? this.httpConfig.tenantId,
                    sourceId: signal.sourceId ?? this.httpConfig.connectorId,
                    sourceType: signal.sourceType ?? 'application',
                });
            }
            return { success: true, signalCount: signals.length };
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to process webhook data');
            return {
                success: false,
                signalCount: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
exports.HttpConnector = HttpConnector;
/**
 * Create an HTTP connector instance
 */
function createHttpConnector(config, logger) {
    return new HttpConnector(config, logger);
}
