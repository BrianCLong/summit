"use strict";
/**
 * Polling Connector
 *
 * A connector that polls an external data source at regular intervals.
 * Useful for APIs that don't support push/webhook mechanisms.
 *
 * @module polling-connector
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollingConnector = void 0;
exports.createPollingConnector = createPollingConnector;
const base_connector_js_1 = require("./base-connector.js");
/**
 * Polling Connector class
 */
class PollingConnector extends base_connector_js_1.BaseConnector {
    pollingConfig;
    pollingTimer = null;
    consecutiveErrors = 0;
    isPolling = false;
    constructor(config, logger) {
        super(config, logger);
        this.pollingConfig = {
            jitterPercent: 10,
            maxConsecutiveErrors: 5,
            ...config,
        };
    }
    /**
     * Connect and start polling
     */
    async doConnect() {
        // Perform initial fetch to verify connectivity
        await this.poll();
        this.startPolling();
        this.logger.info({ intervalMs: this.pollingConfig.pollingIntervalMs }, 'Polling started');
    }
    /**
     * Disconnect and stop polling
     */
    async doDisconnect() {
        this.stopPolling();
        this.logger.info('Polling stopped');
    }
    /**
     * Check health
     */
    async checkHealth() {
        return this.consecutiveErrors < (this.pollingConfig.maxConsecutiveErrors ?? 5);
    }
    /**
     * Start the polling timer
     */
    startPolling() {
        this.stopPolling();
        this.scheduleNextPoll();
    }
    /**
     * Stop the polling timer
     */
    stopPolling() {
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = null;
        }
    }
    /**
     * Schedule the next poll with jitter
     */
    scheduleNextPoll() {
        const baseInterval = this.pollingConfig.pollingIntervalMs;
        const jitterPercent = this.pollingConfig.jitterPercent ?? 10;
        const jitter = baseInterval * (jitterPercent / 100) * (Math.random() - 0.5) * 2;
        const interval = Math.max(1000, baseInterval + jitter);
        this.pollingTimer = setTimeout(() => this.pollAndReschedule(), interval);
    }
    /**
     * Poll and reschedule
     */
    async pollAndReschedule() {
        if (this.status !== 'connected') {
            return;
        }
        try {
            await this.poll();
            this.consecutiveErrors = 0;
        }
        catch (error) {
            this.consecutiveErrors++;
            this.logger.error({ error, consecutiveErrors: this.consecutiveErrors }, 'Polling error');
            if (this.consecutiveErrors >= (this.pollingConfig.maxConsecutiveErrors ?? 5)) {
                this.logger.error('Max consecutive errors reached, triggering reconnect');
                this.emit('error', new Error('Max consecutive polling errors reached'));
                return;
            }
        }
        this.scheduleNextPoll();
    }
    /**
     * Perform a single poll
     */
    async poll() {
        if (this.isPolling) {
            this.logger.warn('Poll already in progress, skipping');
            return;
        }
        this.isPolling = true;
        try {
            const data = await this.pollingConfig.fetchData();
            if (data === null || data === undefined) {
                return;
            }
            const signals = this.pollingConfig.transform(data);
            if (!signals) {
                return;
            }
            const signalArray = Array.isArray(signals) ? signals : [signals];
            for (const signal of signalArray) {
                this.emitSignal({
                    ...signal,
                    tenantId: signal.tenantId ?? this.pollingConfig.tenantId,
                    sourceId: signal.sourceId ?? this.pollingConfig.connectorId,
                    sourceType: signal.sourceType ?? 'feed',
                });
            }
            this.logger.debug({ signalCount: signalArray.length }, 'Poll completed');
        }
        finally {
            this.isPolling = false;
        }
    }
    /**
     * Force an immediate poll
     */
    async forcePoll() {
        await this.poll();
    }
}
exports.PollingConnector = PollingConnector;
/**
 * Create a polling connector instance
 */
function createPollingConnector(config, logger) {
    return new PollingConnector(config, logger);
}
