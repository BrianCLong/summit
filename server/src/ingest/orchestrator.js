"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineOrchestrator = void 0;
const uuid_1 = require("uuid");
const normalization_js_1 = require("./stages/normalization.js");
const enrichment_js_1 = require("./stages/enrichment.js");
const indexing_js_1 = require("./stages/indexing.js");
const file_js_1 = require("../connectors/file.js");
const http_js_1 = require("../connectors/http.js");
const base_js_1 = require("../connectors/base.js");
class PipelineOrchestrator {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async runPipeline(pipeline) {
        const runId = (0, uuid_1.v4)();
        this.logger.info({ pipeline: pipeline.key, runId }, 'Starting pipeline run');
        // 1. Resolve Connector
        let connector;
        if (pipeline.source.type === 'file') {
            connector = new file_js_1.FileSourceConnector(pipeline.source.config);
        }
        else if (pipeline.source.type === 'api') {
            connector = new http_js_1.HttpSourceConnector(pipeline.source.config);
        }
        else {
            throw new Error(`Unknown source type: ${pipeline.source.type}`);
        }
        // 2. Setup Context
        const ctx = {
            pipeline,
            runId,
            tenantId: pipeline.tenantId,
            logger: this.logger.child({ runId, pipeline: pipeline.key }),
        };
        // 3. Build Stages
        const stages = [];
        if (pipeline.stages.includes('normalize')) {
            stages.push(new normalization_js_1.NormalizationStage(pipeline.options?.normalization || {}));
        }
        if (pipeline.stages.includes('enrich')) {
            stages.push(new enrichment_js_1.EnrichmentStage());
        }
        if (pipeline.stages.includes('index')) {
            stages.push(new indexing_js_1.IndexingStage());
        }
        // 4. Execution Loop
        // Use a simple in-memory store for this run
        const stateStore = new base_js_1.InMemoryStateStore();
        // In a real system, we'd load the previous cursor from DB
        // await stateStore.setCursor(await db.getCursor(pipeline.key));
        const connectorCtx = {
            tenantId: ctx.tenantId,
            pipelineKey: pipeline.key,
            logger: ctx.logger,
            stateStore
        };
        let hasMore = true;
        while (hasMore) {
            const cursor = await stateStore.getCursor();
            const batch = await connector.fetchBatch(connectorCtx, cursor);
            if (batch.records.length === 0) {
                hasMore = false;
                break;
            }
            let currentBatch = batch.records;
            for (const stage of stages) {
                try {
                    currentBatch = await stage.process(ctx, currentBatch);
                }
                catch (err) {
                    ctx.logger.error({ err, stage: stage.name }, 'Stage failed');
                    // Logic to send to DLQ would go here
                    throw err;
                }
            }
            if (batch.nextCursor) {
                await stateStore.setCursor(batch.nextCursor);
            }
            else {
                hasMore = false;
            }
        }
        this.logger.info({ pipeline: pipeline.key, runId }, 'Pipeline run completed');
    }
}
exports.PipelineOrchestrator = PipelineOrchestrator;
