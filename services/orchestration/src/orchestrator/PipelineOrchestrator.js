"use strict";
/**
 * Pipeline orchestrator - manages pipeline execution and coordination
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineOrchestrator = void 0;
const PipelineExecutor_1 = require("@intelgraph/etl-framework/src/pipeline/PipelineExecutor");
class PipelineOrchestrator {
    logger;
    pipelines = new Map();
    runs = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Create new pipeline
     */
    async createPipeline(config) {
        this.pipelines.set(config.id, config);
        this.runs.set(config.id, []);
        this.logger.info(`Created pipeline ${config.id}: ${config.name}`);
        return config;
    }
    /**
     * List all pipelines
     */
    async listPipelines() {
        return Array.from(this.pipelines.values());
    }
    /**
     * Get pipeline by ID
     */
    async getPipeline(pipelineId) {
        return this.pipelines.get(pipelineId);
    }
    /**
     * Execute pipeline
     */
    async executePipeline(pipelineId) {
        const config = this.pipelines.get(pipelineId);
        if (!config) {
            throw new Error(`Pipeline ${pipelineId} not found`);
        }
        this.logger.info(`Executing pipeline ${pipelineId}: ${config.name}`);
        // Create executor and run pipeline
        const executor = new PipelineExecutor_1.PipelineExecutor(this.logger);
        // Create connector based on config
        const connector = this.createConnector(config);
        const run = await executor.execute(connector, config);
        // Store run history
        const pipelineRuns = this.runs.get(pipelineId) || [];
        pipelineRuns.push(run);
        this.runs.set(pipelineId, pipelineRuns);
        return run;
    }
    /**
     * Get pipeline runs
     */
    async getPipelineRuns(pipelineId, limit = 100) {
        const runs = this.runs.get(pipelineId) || [];
        return runs.slice(-limit);
    }
    /**
     * Get pipeline run by ID
     */
    async getPipelineRun(pipelineId, runId) {
        const runs = this.runs.get(pipelineId) || [];
        return runs.find(run => run.id === runId);
    }
    /**
     * Cancel pipeline run
     */
    async cancelPipelineRun(pipelineId, runId) {
        // Would implement cancellation logic
        this.logger.info(`Cancelling pipeline run ${runId} for pipeline ${pipelineId}`);
    }
    createConnector(config) {
        // Factory method to create appropriate connector based on source type
        // Would import and instantiate the correct connector class
        // Placeholder - in production would return actual connector instance
        return {
            connect: async () => { },
            disconnect: async () => { },
            testConnection: async () => true,
            extract: async function* () {
                yield [];
            },
            getSchema: async () => ({}),
            getCapabilities: () => ({
                supportsStreaming: false,
                supportsIncremental: false,
                supportsCDC: false,
                supportsSchema: false,
                supportsPartitioning: false,
                maxConcurrentConnections: 1
            })
        };
    }
}
exports.PipelineOrchestrator = PipelineOrchestrator;
