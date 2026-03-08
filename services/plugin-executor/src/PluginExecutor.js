"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginExecutor = void 0;
const bull_1 = __importDefault(require("bull"));
const plugin_system_1 = require("@intelgraph/plugin-system");
/**
 * Plugin executor service with job queue
 */
class PluginExecutor {
    pluginManager;
    jobQueue;
    constructor() {
        // Initialize plugin system
        const sandbox = new plugin_system_1.PluginSandbox();
        const loader = new plugin_system_1.DefaultPluginLoader(sandbox);
        const registry = new plugin_system_1.InMemoryPluginRegistry();
        const resolver = new plugin_system_1.DefaultDependencyResolver('1.0.0');
        this.pluginManager = new plugin_system_1.PluginManager(loader, registry, resolver, '1.0.0');
        // Initialize job queue
        this.jobQueue = new bull_1.default('plugin-execution', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
        });
        this.setupQueueProcessors();
    }
    /**
     * Execute plugin action
     */
    async execute(request) {
        // Add job to queue
        const job = await this.jobQueue.add('execute-plugin', request, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            timeout: request.timeout || 30000,
        });
        return job.id.toString();
    }
    /**
     * Get job status
     */
    async getJobStatus(jobId) {
        const job = await this.jobQueue.getJob(jobId);
        if (!job) {
            return {
                id: jobId,
                status: 'not_found',
            };
        }
        const state = await job.getState();
        const progress = job.progress();
        let result;
        if (state === 'completed') {
            result = job.returnvalue;
        }
        let error;
        if (state === 'failed') {
            error = job.failedReason;
        }
        return {
            id: jobId,
            status: state,
            progress: progress,
            result,
            error,
        };
    }
    /**
     * Setup queue processors
     */
    setupQueueProcessors() {
        this.jobQueue.process('execute-plugin', async (job) => {
            const { pluginId, action, parameters } = job.data;
            try {
                // Get plugin instance
                const instance = this.pluginManager.get(pluginId);
                if (!instance) {
                    throw new Error(`Plugin ${pluginId} is not enabled`);
                }
                // Execute action (simplified - would route to specific handler)
                job.progress(50);
                const result = await this.executePluginAction(instance.plugin, action, parameters);
                job.progress(100);
                return result;
            }
            catch (error) {
                console.error(`Plugin execution failed for ${pluginId}:`, error);
                throw error;
            }
        });
        // Log job completion
        this.jobQueue.on('completed', (job) => {
            console.log(`Job ${job.id} completed successfully`);
        });
        // Log job failures
        this.jobQueue.on('failed', (job, err) => {
            console.error(`Job ${job.id} failed:`, err);
        });
    }
    /**
     * Execute plugin action (simplified)
     */
    async executePluginAction(plugin, action, parameters) {
        // In real implementation, would:
        // 1. Check permissions
        // 2. Apply rate limiting
        // 3. Monitor resource usage
        // 4. Execute in sandbox
        // 5. Return result
        return { success: true, data: {} };
    }
}
exports.PluginExecutor = PluginExecutor;
