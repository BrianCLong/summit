"use strict";
/**
 * Discovery Job Runner
 * Executes scheduled metadata discovery jobs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryJobRunner = void 0;
const discovery_js_1 = require("../types/discovery.js");
const PostgresExtractor_js_1 = require("../extractors/PostgresExtractor.js");
const DataProfiler_js_1 = require("../profilers/DataProfiler.js");
class DiscoveryJobRunner {
    store;
    profiler;
    constructor(store) {
        this.store = store;
        this.profiler = new DataProfiler_js_1.DataProfiler();
    }
    /**
     * Execute discovery job
     */
    async executeJob(jobConfig, sourceConfig) {
        const execution = {
            id: this.generateExecutionId(jobConfig.id),
            jobId: jobConfig.id,
            status: discovery_js_1.JobStatus.RUNNING,
            startedAt: new Date(),
            completedAt: null,
            assetsDiscovered: 0,
            errors: [],
            metadata: {},
        };
        try {
            // Extract metadata based on source type
            const extractionResult = await this.extractMetadata(sourceConfig, jobConfig);
            execution.assetsDiscovered = extractionResult.assets.length;
            execution.metadata = {
                statistics: extractionResult.statistics,
            };
            // Profile data if enabled
            if (jobConfig.options.profileData) {
                await this.profileAssets(extractionResult, jobConfig);
            }
            execution.status = discovery_js_1.JobStatus.COMPLETED;
            execution.completedAt = new Date();
        }
        catch (error) {
            execution.status = discovery_js_1.JobStatus.FAILED;
            execution.completedAt = new Date();
            execution.errors.push({
                code: 'EXECUTION_FAILED',
                message: error instanceof Error ? error.message : 'Unknown error',
                source: jobConfig.name,
                timestamp: new Date(),
                severity: discovery_js_1.ErrorSeverity.CRITICAL,
            });
        }
        await this.store.saveExecution(execution);
        return execution;
    }
    /**
     * Extract metadata from source
     */
    async extractMetadata(sourceConfig, jobConfig) {
        switch (sourceConfig.type) {
            case 'POSTGRESQL':
                return this.extractFromPostgres(sourceConfig, jobConfig);
            // Add more source types as needed
            default:
                throw new Error(`Unsupported source type: ${sourceConfig.type}`);
        }
    }
    /**
     * Extract from PostgreSQL
     */
    async extractFromPostgres(sourceConfig, jobConfig) {
        const extractor = new PostgresExtractor_js_1.PostgresExtractor(sourceConfig.connectionString);
        try {
            const result = await extractor.extract();
            return result;
        }
        finally {
            await extractor.close();
        }
    }
    /**
     * Profile discovered assets
     */
    async profileAssets(extractionResult, jobConfig) {
        for (const asset of extractionResult.assets) {
            if (asset.sampleData.length > 0 && asset.schema?.columns) {
                const columnNames = asset.schema.columns.map((c) => c.name);
                const profilingResult = await this.profiler.profileData(asset.name, asset.sampleData, columnNames);
                // Store profiling results
                asset.statistics = {
                    ...asset.statistics,
                    profiling: profilingResult,
                };
            }
        }
    }
    /**
     * Schedule job execution
     */
    async scheduleJob(jobConfig) {
        // Parse cron schedule and calculate next run time
        const nextRun = this.calculateNextRun(jobConfig.schedule);
        await this.store.updateJobStatus(jobConfig.id, new Date(), nextRun);
    }
    /**
     * Calculate next run time from cron expression
     */
    calculateNextRun(cronExpression) {
        // Simple implementation - in production, use a proper cron parser
        const now = new Date();
        const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Daily for now
        return nextRun;
    }
    /**
     * Generate execution ID
     */
    generateExecutionId(jobId) {
        return `exec-${jobId}-${Date.now()}`;
    }
}
exports.DiscoveryJobRunner = DiscoveryJobRunner;
