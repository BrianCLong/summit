"use strict";
// @ts-nocheck
/**
 * IntelGraph Connector SDK
 * Extensible framework for data ingestion connectors
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectorRegistry = exports.ConnectorRegistry = exports.BaseConnector = void 0;
const events_1 = require("events");
const logger_js_1 = require("../utils/logger.js");
class BaseConnector extends events_1.EventEmitter {
    config;
    parameters = {};
    metrics;
    status;
    isRunning = false;
    isPaused = false;
    constructor(config) {
        super();
        this.config = config;
        this.metrics = this.initializeMetrics();
        this.status = this.initializeStatus();
    }
    initializeMetrics() {
        return {
            recordsProcessed: 0,
            recordsSuccessful: 0,
            recordsFailures: 0,
            batchesProcessed: 0,
            avgProcessingTime: 0,
            totalRunTime: 0,
            errors: [],
        };
    }
    initializeStatus() {
        return {
            status: 'idle',
            progress: {
                current: 0,
                total: 0,
                percentage: 0,
            },
            metrics: this.metrics,
        };
    }
    // Configuration methods
    getConfig() {
        return { ...this.config };
    }
    setParameters(parameters) {
        this.parameters = { ...parameters };
    }
    getParameters() {
        return { ...this.parameters };
    }
    // Status and metrics
    getStatus() {
        return {
            ...this.status,
            metrics: { ...this.metrics },
        };
    }
    getMetrics() {
        return { ...this.metrics };
    }
    // Main execution methods
    async run() {
        if (this.isRunning) {
            throw new Error('Connector is already running');
        }
        try {
            // Validate parameters
            const validation = await this.validate(this.parameters);
            if (!validation.valid) {
                throw new Error(`Invalid parameters: ${validation.errors?.join(', ')}`);
            }
            this.isRunning = true;
            this.isPaused = false;
            this.status.status = 'running';
            this.status.startTime = new Date();
            this.metrics.lastRunTime = this.status.startTime;
            logger_js_1.logger.info({
                message: 'Starting connector',
                connectorId: this.config.id,
                connectorName: this.config.name,
            });
            this.emit('start');
            // Connect to data source
            await this.connect();
            this.emit('connected');
            // Process data in batches
            let batchCount = 0;
            const batchSize = this.config.batchSize || 100;
            for await (const records of this.fetchData()) {
                if (!this.isRunning)
                    break;
                while (this.isPaused && this.isRunning) {
                    await this.sleep(1000); // Wait while paused
                }
                if (!this.isRunning)
                    break;
                const batch = {
                    records,
                    batchId: `${this.config.id}-${Date.now()}-${batchCount}`,
                    timestamp: new Date(),
                    source: this.config.name,
                    metadata: {
                        connectorVersion: this.config.version,
                        batchNumber: batchCount,
                    },
                };
                await this.processBatch(batch);
                batchCount++;
                // Update progress
                this.status.progress.current += records.length;
                this.updateProgress();
            }
            this.status.status = 'completed';
            this.status.endTime = new Date();
            this.metrics.totalRunTime +=
                this.status.endTime.getTime() - this.status.startTime.getTime();
            logger_js_1.logger.info({
                message: 'Connector completed successfully',
                connectorId: this.config.id,
                metrics: this.metrics,
            });
            this.emit('completed', this.metrics);
        }
        catch (error) {
            this.handleError(error);
        }
        finally {
            this.isRunning = false;
            await this.disconnect().catch((err) => logger_js_1.logger.error({
                message: 'Error disconnecting',
                connectorId: this.config.id,
                error: err instanceof Error ? err.message : String(err),
            }));
        }
    }
    async processBatch(batch) {
        const startTime = Date.now();
        try {
            this.emit('batchStart', batch);
            // Process each record in the batch
            const results = await Promise.allSettled(batch.records.map((record) => this.processRecord(record)));
            // Update metrics based on results
            results.forEach((result, index) => {
                this.metrics.recordsProcessed++;
                if (result.status === 'fulfilled') {
                    this.metrics.recordsSuccessful++;
                }
                else {
                    this.metrics.recordsFailures++;
                    this.metrics.errors.push({
                        timestamp: new Date(),
                        error: result.reason?.message || 'Unknown error',
                        recordId: batch.records[index].id,
                    });
                }
            });
            this.metrics.batchesProcessed++;
            const processingTime = Date.now() - startTime;
            this.metrics.avgProcessingTime =
                (this.metrics.avgProcessingTime * (this.metrics.batchesProcessed - 1) +
                    processingTime) /
                    this.metrics.batchesProcessed;
            this.emit('batchCompleted', {
                batch,
                results: results.map((r) => r.status),
                processingTime,
            });
            logger_js_1.logger.debug({
                message: 'Batch processed',
                connectorId: this.config.id,
                batchId: batch.batchId,
                recordCount: batch.records.length,
                successCount: results.filter((r) => r.status === 'fulfilled').length,
                processingTime,
            });
        }
        catch (error) {
            this.emit('batchError', { batch, error });
            throw error;
        }
    }
    async processRecord(record) {
        // Default implementation - emit record for processing
        // Can be overridden by specific connectors for custom processing
        this.emit('record', record);
        // Add processing delay to prevent overwhelming downstream systems
        if (this.config.timeout) {
            await this.sleep(this.config.timeout);
        }
    }
    // Control methods
    pause() {
        if (!this.isRunning) {
            throw new Error('Cannot pause - connector is not running');
        }
        this.isPaused = true;
        this.status.status = 'paused';
        this.emit('paused');
    }
    resume() {
        if (!this.isRunning) {
            throw new Error('Cannot resume - connector is not running');
        }
        this.isPaused = false;
        this.status.status = 'running';
        this.emit('resumed');
    }
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.status.status = 'idle';
        this.emit('stopped');
    }
    // Utility methods
    updateProgress() {
        if (this.status.progress.total > 0) {
            this.status.progress.percentage = Math.round((this.status.progress.current / this.status.progress.total) * 100);
        }
        this.emit('progress', this.status.progress);
    }
    handleError(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.status.status = 'error';
        this.status.lastError = errorMessage;
        this.status.endTime = new Date();
        this.metrics.errors.push({
            timestamp: new Date(),
            error: errorMessage,
        });
        logger_js_1.logger.error({
            message: 'Connector error',
            connectorId: this.config.id,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        });
        this.emit('error', error);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // Data transformation utilities
    createRecord(id, type, data, metadata) {
        return {
            id,
            type,
            data,
            metadata: {
                source: this.config.name,
                timestamp: new Date(),
                confidence: 1.0,
                ...metadata,
            },
        };
    }
    validateRecord(record) {
        const errors = [];
        if (!record.id)
            errors.push('Record ID is required');
        if (!record.type)
            errors.push('Record type is required');
        if (!record.data || typeof record.data !== 'object')
            errors.push('Record data must be an object');
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    // Schema mapping utilities
    mapFields(data, fieldMapping) {
        const mapped = {};
        for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
            if (data[sourceField] !== undefined) {
                mapped[targetField] = data[sourceField];
            }
        }
        return mapped;
    }
    applyTransformations(data, transformations) {
        const transformed = { ...data };
        for (const { field, transform } of transformations) {
            if (transformed[field] !== undefined) {
                try {
                    transformed[field] = transform(transformed[field]);
                }
                catch (error) {
                    logger_js_1.logger.warn({
                        message: 'Transformation failed',
                        field,
                        value: transformed[field],
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
        return transformed;
    }
}
exports.BaseConnector = BaseConnector;
// Connector Registry for managing available connectors
class ConnectorRegistry {
    connectors = new Map();
    instances = new Map();
    register(connectorClass) {
        const tempInstance = new connectorClass({});
        const config = tempInstance.getConfig();
        this.connectors.set(config.id, connectorClass);
    }
    getAvailableConnectors() {
        const configs = [];
        for (const ConnectorClass of this.connectors.values()) {
            const tempInstance = new ConnectorClass({});
            configs.push(tempInstance.getConfig());
        }
        return configs;
    }
    createConnector(connectorId, parameters) {
        const ConnectorClass = this.connectors.get(connectorId);
        if (!ConnectorClass) {
            throw new Error(`Connector not found: ${connectorId}`);
        }
        const tempInstance = new ConnectorClass({});
        const config = tempInstance.getConfig();
        const connector = new ConnectorClass(config);
        connector.setParameters(parameters);
        const instanceId = `${connectorId}-${Date.now()}`;
        this.instances.set(instanceId, connector);
        return connector;
    }
    getConnectorInstance(instanceId) {
        return this.instances.get(instanceId);
    }
    removeInstance(instanceId) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.stop();
            this.instances.delete(instanceId);
        }
    }
}
exports.ConnectorRegistry = ConnectorRegistry;
// Global registry instance
exports.connectorRegistry = new ConnectorRegistry();
