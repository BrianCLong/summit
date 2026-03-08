"use strict";
/**
 * ProjectionManager - Manage read model projections
 *
 * Build and maintain read models from event streams
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectionManager = void 0;
const events_1 = require("events");
const pino_1 = __importDefault(require("pino"));
class ProjectionManager extends events_1.EventEmitter {
    projections = new Map();
    states = new Map();
    eventStore;
    pool;
    logger;
    polling = new Map();
    schema;
    constructor(eventStore, pool, schema = 'public') {
        super();
        this.eventStore = eventStore;
        this.pool = pool;
        this.schema = schema;
        this.logger = (0, pino_1.default)({ name: 'ProjectionManager' });
    }
    /**
     * Initialize projection manager
     */
    async initialize() {
        this.logger.info('Initializing ProjectionManager...');
        // Create projection state table
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.projection_state (
        projection_name VARCHAR(255) PRIMARY KEY,
        last_event_id UUID,
        last_event_timestamp TIMESTAMPTZ,
        last_processed_version INTEGER,
        position BIGINT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL,
        error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        this.logger.info('ProjectionManager initialized');
    }
    /**
     * Register a projection
     */
    register(projection, options = {}) {
        if (this.projections.has(projection.name)) {
            throw new Error(`Projection already registered: ${projection.name}`);
        }
        this.projections.set(projection.name, projection);
        this.logger.info({ name: projection.name, version: projection.version }, 'Projection registered');
        if (options.autoStart !== false) {
            this.start(projection.name, options).catch(err => {
                this.logger.error({ err, name: projection.name }, 'Failed to start projection');
            });
        }
    }
    /**
     * Start projection processing
     */
    async start(projectionName, options = {}) {
        const projection = this.projections.get(projectionName);
        if (!projection) {
            throw new Error(`Projection not found: ${projectionName}`);
        }
        // Load state
        let state = await this.loadState(projectionName);
        if (!state) {
            // Initialize projection
            if (projection.initialize) {
                await projection.initialize();
            }
            state = {
                projectionName,
                position: 0,
                status: 'running'
            };
            await this.saveState(state);
        }
        else {
            state.status = 'running';
            await this.saveState(state);
        }
        this.states.set(projectionName, state);
        // Start polling for events
        const pollInterval = options.pollInterval || 1000;
        const batchSize = options.batchSize || 100;
        const poll = async () => {
            try {
                await this.processEvents(projection, batchSize);
            }
            catch (err) {
                this.logger.error({ err, projectionName }, 'Projection processing error');
            }
        };
        const interval = setInterval(poll, pollInterval);
        this.polling.set(projectionName, interval);
        // Initial poll
        poll().catch(err => {
            this.logger.error({ err, projectionName }, 'Initial poll failed');
        });
        this.logger.info({ projectionName }, 'Projection started');
        this.emit('projection:started', projectionName);
    }
    /**
     * Stop projection processing
     */
    async stop(projectionName) {
        const interval = this.polling.get(projectionName);
        if (interval) {
            clearInterval(interval);
            this.polling.delete(projectionName);
        }
        const state = this.states.get(projectionName);
        if (state) {
            state.status = 'stopped';
            await this.saveState(state);
        }
        this.logger.info({ projectionName }, 'Projection stopped');
        this.emit('projection:stopped', projectionName);
    }
    /**
     * Rebuild projection from scratch
     */
    async rebuild(projectionName) {
        const projection = this.projections.get(projectionName);
        if (!projection) {
            throw new Error(`Projection not found: ${projectionName}`);
        }
        this.logger.info({ projectionName }, 'Rebuilding projection');
        // Stop if running
        await this.stop(projectionName);
        // Update state
        const state = {
            projectionName,
            position: 0,
            status: 'rebuilding'
        };
        await this.saveState(state);
        this.states.set(projectionName, state);
        // Rebuild
        if (projection.rebuild) {
            await projection.rebuild();
        }
        // Reset position and restart
        state.position = 0;
        state.status = 'running';
        await this.saveState(state);
        await this.start(projectionName);
        this.logger.info({ projectionName }, 'Projection rebuilt');
        this.emit('projection:rebuilt', projectionName);
    }
    /**
     * Process events for projection
     */
    async processEvents(projection, batchSize) {
        const state = this.states.get(projection.name);
        if (!state || state.status !== 'running') {
            return;
        }
        try {
            // Get events since last position
            const events = await this.eventStore.queryEvents({
                fromTimestamp: state.lastEventTimestamp
            });
            if (events.length === 0) {
                return;
            }
            // Process events in batch
            const batch = events.slice(0, batchSize);
            for (const event of batch) {
                const handler = projection.eventHandlers.get(event.eventType);
                if (handler) {
                    await handler(event);
                    state.lastEventId = event.eventId;
                    state.lastEventTimestamp = event.timestamp;
                    state.lastProcessedVersion = event.version;
                    state.position++;
                }
            }
            await this.saveState(state);
            this.emit('projection:events-processed', {
                projectionName: projection.name,
                count: batch.length
            });
        }
        catch (err) {
            this.logger.error({ err, projectionName: projection.name }, 'Event processing failed');
            state.status = 'error';
            state.error = err.message;
            await this.saveState(state);
            this.emit('projection:error', {
                projectionName: projection.name,
                error: err
            });
        }
    }
    /**
     * Load projection state
     */
    async loadState(projectionName) {
        const result = await this.pool.query(`SELECT * FROM ${this.schema}.projection_state WHERE projection_name = $1`, [projectionName]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            projectionName: row.projection_name,
            lastEventId: row.last_event_id,
            lastEventTimestamp: row.last_event_timestamp,
            lastProcessedVersion: row.last_processed_version,
            position: parseInt(row.position, 10),
            status: row.status,
            error: row.error
        };
    }
    /**
     * Save projection state
     */
    async saveState(state) {
        await this.pool.query(`INSERT INTO ${this.schema}.projection_state (
        projection_name, last_event_id, last_event_timestamp,
        last_processed_version, position, status, error, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (projection_name) DO UPDATE SET
        last_event_id = EXCLUDED.last_event_id,
        last_event_timestamp = EXCLUDED.last_event_timestamp,
        last_processed_version = EXCLUDED.last_processed_version,
        position = EXCLUDED.position,
        status = EXCLUDED.status,
        error = EXCLUDED.error,
        updated_at = NOW()`, [
            state.projectionName,
            state.lastEventId,
            state.lastEventTimestamp,
            state.lastProcessedVersion,
            state.position,
            state.status,
            state.error
        ]);
    }
    /**
     * Get projection statistics
     */
    async getStats(projectionName) {
        const state = this.states.get(projectionName);
        if (!state) {
            return null;
        }
        // Calculate processing rate
        // This is simplified - could track more detailed metrics
        const processingRate = 0; // events per second
        return {
            projectionName,
            status: state.status,
            eventsProcessed: state.position,
            lastEventTimestamp: state.lastEventTimestamp,
            processingRate,
            lag: undefined
        };
    }
    /**
     * Shutdown projection manager
     */
    async shutdown() {
        this.logger.info('Shutting down ProjectionManager...');
        for (const projectionName of this.projections.keys()) {
            await this.stop(projectionName);
        }
        this.logger.info('ProjectionManager shut down');
    }
}
exports.ProjectionManager = ProjectionManager;
