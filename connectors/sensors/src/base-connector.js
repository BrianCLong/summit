"use strict";
/**
 * Base Connector
 *
 * Abstract base class for all sensor connectors.
 * Provides common functionality for:
 * - Connection lifecycle management
 * - Signal emission
 * - Health monitoring
 * - Metrics collection
 *
 * @module base-connector
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseConnector = void 0;
const eventemitter3_1 = require("eventemitter3");
/**
 * Default configuration
 */
const defaultConfig = {
    autoReconnect: true,
    reconnectDelayMs: 5000,
    maxReconnectAttempts: 10,
    healthCheckIntervalMs: 30000,
    batchSize: 100,
    batchTimeoutMs: 1000,
};
/**
 * Abstract Base Connector class
 */
class BaseConnector extends eventemitter3_1.EventEmitter {
    config;
    logger;
    status = 'disconnected';
    metrics;
    signalBuffer = [];
    batchTimer = null;
    healthCheckTimer = null;
    reconnectAttempts = 0;
    connectedAt = null;
    constructor(config, logger) {
        super();
        this.config = { ...defaultConfig, ...config };
        this.logger = logger.child({
            component: 'connector',
            connectorId: this.config.connectorId,
            connectorName: this.config.name,
        });
        this.metrics = this.initializeMetrics();
    }
    /**
     * Initialize metrics
     */
    initializeMetrics() {
        return {
            signalsReceived: 0,
            signalsEmitted: 0,
            signalsDropped: 0,
            errorsCount: 0,
            lastSignalAt: null,
            lastErrorAt: null,
            connectionUptime: 0,
            reconnectCount: 0,
        };
    }
    /**
     * Connect to the data source
     */
    async connect() {
        if (this.status === 'connected' || this.status === 'connecting') {
            this.logger.warn('Already connected or connecting');
            return;
        }
        this.setStatus('connecting');
        this.logger.info('Connecting...');
        try {
            await this.doConnect();
            this.connectedAt = Date.now();
            this.reconnectAttempts = 0;
            this.setStatus('connected');
            this.emit('connected');
            this.startHealthCheck();
            this.logger.info('Connected successfully');
        }
        catch (error) {
            this.handleConnectionError(error);
        }
    }
    /**
     * Disconnect from the data source
     */
    async disconnect() {
        if (this.status === 'disconnected') {
            this.logger.warn('Already disconnected');
            return;
        }
        this.logger.info('Disconnecting...');
        this.stopHealthCheck();
        this.flushBuffer();
        try {
            await this.doDisconnect();
        }
        catch (error) {
            this.logger.error({ error }, 'Error during disconnect');
        }
        this.connectedAt = null;
        this.setStatus('disconnected');
        this.emit('disconnected', 'Manual disconnect');
        this.logger.info('Disconnected');
    }
    /**
     * Handle connection error
     */
    handleConnectionError(error) {
        this.metrics.errorsCount++;
        this.metrics.lastErrorAt = Date.now();
        this.setStatus('error');
        this.emit('error', error);
        this.logger.error({ error }, 'Connection error');
        if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
        }
    }
    /**
     * Schedule a reconnection attempt
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        this.metrics.reconnectCount++;
        const delay = this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);
        this.logger.info({ attempt: this.reconnectAttempts, maxAttempts: this.config.maxReconnectAttempts, delayMs: delay }, 'Scheduling reconnect');
        this.setStatus('reconnecting');
        setTimeout(() => {
            this.connect().catch((error) => {
                this.logger.error({ error }, 'Reconnect failed');
            });
        }, Math.min(delay, 60000)); // Cap at 1 minute
    }
    /**
     * Set connector status
     */
    setStatus(status) {
        if (this.status !== status) {
            this.status = status;
            this.emit('statusChange', status);
        }
    }
    /**
     * Emit a signal
     */
    emitSignal(signal) {
        this.metrics.signalsReceived++;
        this.metrics.lastSignalAt = Date.now();
        // Add to buffer
        this.signalBuffer.push(signal);
        // Check if we should flush
        if (this.signalBuffer.length >= this.config.batchSize) {
            this.flushBuffer();
        }
        else if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.flushBuffer(), this.config.batchTimeoutMs);
        }
    }
    /**
     * Flush the signal buffer
     */
    flushBuffer() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        if (this.signalBuffer.length === 0) {
            return;
        }
        const signals = this.signalBuffer.splice(0);
        for (const signal of signals) {
            this.emit('signal', signal);
            this.metrics.signalsEmitted++;
        }
        this.logger.debug({ count: signals.length }, 'Flushed signal buffer');
    }
    /**
     * Start health check timer
     */
    startHealthCheck() {
        this.stopHealthCheck();
        this.healthCheckTimer = setInterval(() => this.performHealthCheck(), this.config.healthCheckIntervalMs);
    }
    /**
     * Stop health check timer
     */
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
    /**
     * Perform health check
     */
    async performHealthCheck() {
        try {
            const healthy = await this.checkHealth();
            if (!healthy) {
                this.logger.warn('Health check failed');
                this.handleConnectionError(new Error('Health check failed'));
            }
        }
        catch (error) {
            this.logger.error({ error }, 'Health check error');
        }
    }
    /**
     * Get connector status
     */
    getStatus() {
        return this.status;
    }
    /**
     * Get connector metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            connectionUptime: this.connectedAt ? Date.now() - this.connectedAt : 0,
        };
    }
    /**
     * Get connector info
     */
    getInfo() {
        return {
            connectorId: this.config.connectorId,
            name: this.config.name,
            tenantId: this.config.tenantId,
            signalTypes: this.config.signalTypes,
            status: this.status,
            metrics: this.getMetrics(),
        };
    }
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = this.initializeMetrics();
    }
}
exports.BaseConnector = BaseConnector;
