"use strict";
/**
 * Pipeline executor - orchestrates ETL/ELT pipeline execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineExecutor = void 0;
const events_1 = require("events");
const types_1 = require("@intelgraph/data-integration/src/types");
const DataTransformer_1 = require("../transformation/DataTransformer");
const DataValidator_1 = require("../validation/DataValidator");
const DataEnricher_1 = require("../enrichment/DataEnricher");
const DataLoader_1 = require("../loading/DataLoader");
class PipelineExecutor extends events_1.EventEmitter {
    logger;
    constructor(logger) {
        super();
        this.logger = logger;
    }
    /**
     * Execute complete ETL/ELT pipeline
     */
    async execute(connector, config) {
        const run = {
            id: this.generateRunId(),
            pipelineId: config.id,
            sourceId: config.id,
            status: types_1.PipelineStatus.RUNNING,
            startTime: new Date(),
            recordsExtracted: 0,
            recordsTransformed: 0,
            recordsLoaded: 0,
            recordsFailed: 0,
            bytesProcessed: 0,
            errors: [],
            metrics: this.initializeMetrics(),
            lineage: []
        };
        this.emit('pipeline:started', run);
        try {
            // 1. Extraction phase
            this.logger.info(`Starting extraction phase for pipeline ${run.pipelineId}`);
            const extractionStart = Date.now();
            const transformer = new DataTransformer_1.DataTransformer(config.transformationConfig, this.logger);
            const validator = new DataValidator_1.DataValidator(config.transformationConfig, this.logger);
            const enricher = new DataEnricher_1.DataEnricher(config.transformationConfig, this.logger);
            const loader = new DataLoader_1.DataLoader(config.loadConfig, this.logger);
            await connector.connect();
            await loader.connect();
            try {
                for await (const batch of connector.extract()) {
                    run.recordsExtracted += batch.length;
                    // 2. Transformation phase
                    const transformedData = await transformer.transform(batch);
                    run.recordsTransformed += transformedData.length;
                    // 3. Validation phase
                    const validationResult = await validator.validate(transformedData);
                    if (!validationResult.isValid && validationResult.failedRecords.length > 0) {
                        run.recordsFailed += validationResult.failedRecords.length;
                        run.errors.push(...validationResult.errors);
                        // Filter out invalid records if configured to skip
                        const validRecords = transformedData.filter((_, idx) => !validationResult.failedRecords.includes(idx));
                        if (validRecords.length === 0) {
                            continue;
                        }
                    }
                    // 4. Enrichment phase
                    const enrichedData = await enricher.enrich(transformedData);
                    // 5. Loading phase
                    const loadResult = await loader.load(enrichedData);
                    run.recordsLoaded += loadResult.recordsLoaded;
                    run.recordsFailed += loadResult.recordsFailed;
                    if (loadResult.errors.length > 0) {
                        run.errors.push(...loadResult.errors);
                    }
                    // Update lineage
                    run.lineage.push({
                        sourceEntity: config.name,
                        targetEntity: config.loadConfig.targetTable,
                        transformations: config.transformationConfig?.transformations.map(t => t.name) || [],
                        timestamp: new Date(),
                        metadata: {
                            batchSize: batch.length,
                            recordsLoaded: loadResult.recordsLoaded
                        }
                    });
                    this.emit('pipeline:progress', {
                        runId: run.id,
                        recordsExtracted: run.recordsExtracted,
                        recordsLoaded: run.recordsLoaded
                    });
                }
                run.metrics.extractionDurationMs = Date.now() - extractionStart;
                run.status = run.recordsFailed > 0 ? types_1.PipelineStatus.PARTIAL_SUCCESS : types_1.PipelineStatus.SUCCESS;
            }
            finally {
                await connector.disconnect();
                await loader.disconnect();
            }
            run.endTime = new Date();
            run.metrics.totalDurationMs = run.endTime.getTime() - run.startTime.getTime();
            run.metrics.throughputRecordsPerSecond = run.recordsLoaded / (run.metrics.totalDurationMs / 1000);
            this.emit('pipeline:completed', run);
            this.logger.info(`Pipeline ${run.pipelineId} completed successfully`, {
                recordsExtracted: run.recordsExtracted,
                recordsLoaded: run.recordsLoaded,
                recordsFailed: run.recordsFailed,
                durationMs: run.metrics.totalDurationMs
            });
            return run;
        }
        catch (error) {
            run.status = types_1.PipelineStatus.FAILED;
            run.endTime = new Date();
            run.errors.push({
                timestamp: new Date(),
                stage: 'extraction',
                message: error instanceof Error ? error.message : 'Unknown error',
                details: error
            });
            this.emit('pipeline:failed', run);
            this.logger.error(`Pipeline ${run.pipelineId} failed`, { error });
            return run;
        }
    }
    generateRunId() {
        return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    initializeMetrics() {
        return {
            extractionDurationMs: 0,
            transformationDurationMs: 0,
            validationDurationMs: 0,
            enrichmentDurationMs: 0,
            loadingDurationMs: 0,
            totalDurationMs: 0,
            throughputRecordsPerSecond: 0,
            throughputMbPerSecond: 0
        };
    }
}
exports.PipelineExecutor = PipelineExecutor;
