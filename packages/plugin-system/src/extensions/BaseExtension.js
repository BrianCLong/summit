"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseExtension = void 0;
/**
 * Base class for all plugin extensions
 */
class BaseExtension {
    manifest;
    context;
    initialized = false;
    running = false;
    constructor(manifest) {
        this.manifest = manifest;
    }
    async initialize(context) {
        if (this.initialized) {
            throw new Error(`Plugin ${this.manifest.id} is already initialized`);
        }
        this.context = context;
        await this.onInitialize(context);
        this.initialized = true;
        this.context.logger.info(`Plugin ${this.manifest.id} initialized`);
    }
    async start() {
        if (!this.initialized) {
            throw new Error(`Plugin ${this.manifest.id} must be initialized before starting`);
        }
        if (this.running) {
            throw new Error(`Plugin ${this.manifest.id} is already running`);
        }
        await this.onStart();
        this.running = true;
        this.context.logger.info(`Plugin ${this.manifest.id} started`);
    }
    async stop() {
        if (!this.running) {
            return;
        }
        await this.onStop();
        this.running = false;
        this.context.logger.info(`Plugin ${this.manifest.id} stopped`);
    }
    async destroy() {
        if (this.running) {
            await this.stop();
        }
        await this.onDestroy();
        this.initialized = false;
        this.context.logger.info(`Plugin ${this.manifest.id} destroyed`);
    }
    async healthCheck() {
        try {
            const customHealth = await this.onHealthCheck();
            return {
                healthy: this.initialized && this.running && customHealth.healthy,
                message: customHealth.message,
                details: {
                    initialized: this.initialized,
                    running: this.running,
                    ...customHealth.details,
                },
            };
        }
        catch (error) {
            return {
                healthy: false,
                message: error instanceof Error ? error.message : 'Health check failed',
            };
        }
    }
    /**
     * Hook: Custom health check logic
     */
    async onHealthCheck() {
        return { healthy: true };
    }
    /**
     * Helper: Log with context
     */
    log = {
        debug: (message, meta) => this.context.logger.debug(message, meta),
        info: (message, meta) => this.context.logger.info(message, meta),
        warn: (message, meta) => this.context.logger.warn(message, meta),
        error: (message, error, meta) => this.context.logger.error(message, error, meta),
    };
}
exports.BaseExtension = BaseExtension;
