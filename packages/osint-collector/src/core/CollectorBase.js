/**
 * Base class for all OSINT collectors
 */
import { EventEmitter } from 'events';
export class CollectorBase extends EventEmitter {
    config;
    isRunning = false;
    constructor(config) {
        super();
        this.config = config;
    }
    /**
     * Initialize the collector
     */
    async initialize() {
        if (!this.config.enabled) {
            throw new Error(`Collector ${this.config.name} is not enabled`);
        }
        await this.onInitialize();
    }
    /**
     * Collect data based on task
     */
    async collect(task) {
        if (!this.config.enabled) {
            throw new Error(`Collector ${this.config.name} is not enabled`);
        }
        this.isRunning = true;
        const startTime = Date.now();
        try {
            this.emit('collection:start', { taskId: task.id, collector: this.config.name });
            const data = await this.performCollection(task);
            const duration = Date.now() - startTime;
            const result = {
                taskId: task.id,
                source: task.source,
                collectedAt: new Date(),
                data,
                metadata: {
                    duration,
                    recordCount: this.countRecords(data)
                }
            };
            this.emit('collection:complete', result);
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.emit('collection:error', {
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Shutdown the collector
     */
    async shutdown() {
        this.isRunning = false;
        await this.onShutdown();
    }
    /**
     * Get collector status
     */
    getStatus() {
        return {
            name: this.config.name,
            enabled: this.config.enabled,
            running: this.isRunning
        };
    }
}
//# sourceMappingURL=CollectorBase.js.map