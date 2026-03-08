"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineOrchestrator = void 0;
const FileConnector_js_1 = require("../connectors/FileConnector.js");
const HttpConnector_js_1 = require("../connectors/HttpConnector.js");
const NormalizationService_js_1 = require("./NormalizationService.js");
const EnrichmentService_js_1 = require("./EnrichmentService.js");
const IndexingService_js_1 = require("./IndexingService.js");
const ChunkingService_js_1 = require("./ChunkingService.js");
const EmbeddingStage_js_1 = require("./EmbeddingStage.js");
const DLQService_js_1 = require("./DLQService.js");
const ProcessorFactory_js_1 = require("./processors/ProcessorFactory.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'PipelineOrchestrator' });
class PipelineOrchestrator {
    normalizationService;
    enrichmentService;
    indexingService;
    chunkingService;
    embeddingStage;
    dlqService;
    processorFactory;
    constructor() {
        this.normalizationService = new NormalizationService_js_1.NormalizationService();
        this.enrichmentService = new EnrichmentService_js_1.EnrichmentService();
        this.indexingService = new IndexingService_js_1.IndexingService();
        this.chunkingService = new ChunkingService_js_1.ChunkingService();
        this.embeddingStage = new EmbeddingStage_js_1.EmbeddingStage();
        this.dlqService = new DLQService_js_1.DLQService();
        this.processorFactory = new ProcessorFactory_js_1.ProcessorFactory();
    }
    async runPipeline(config) {
        logger.info({ pipeline: config.key }, 'Starting pipeline run');
        const ctx = {
            tenantId: config.tenantId,
            pipelineKey: config.key,
            logger,
            correlationId: `run-${Date.now()}`
        };
        try {
            // 1. Initialize Source
            const source = this.getConnector(config);
            let cursor = null;
            let hasMore = true;
            while (hasMore) {
                // 2. Fetch Batch (RAW)
                let rawRecords = [];
                try {
                    const batch = await source.fetchBatch(ctx, cursor);
                    rawRecords = batch.records;
                    if (!batch.nextCursor || batch.nextCursor === 'DONE') {
                        hasMore = false;
                    }
                    else {
                        cursor = batch.nextCursor;
                    }
                }
                catch (e) {
                    await this.dlqService.recordFailure(ctx, 'RAW', e.message, { cursor });
                    break; // Abort if source fails
                }
                if (rawRecords.length === 0)
                    continue;
                logger.info({ count: rawRecords.length, stage: 'RAW' }, 'Fetched records');
                // SPECIAL HANDLING FOR FILE CONNECTOR TO USE PROCESSORS
                let processedDocuments = [];
                if (config.source.type === 'file') {
                    for (const record of rawRecords) {
                        // Determine processor based on path
                        if (record.path) {
                            const processor = this.processorFactory.getProcessor(record.path);
                            // Prepare content: prefer raw buffer 'content', else buffer from 'text'
                            let content;
                            if (record.content && Buffer.isBuffer(record.content)) {
                                content = record.content;
                            }
                            else if (typeof record.text === 'string') {
                                content = Buffer.from(record.text, 'utf-8');
                            }
                            else {
                                content = Buffer.from('');
                            }
                            try {
                                const docs = await processor.process(content, { ...record, tenantId: ctx.tenantId });
                                processedDocuments.push(...docs);
                            }
                            catch (e) {
                                logger.error({ file: record.path, error: e.message }, 'Failed to process file');
                                await this.dlqService.recordFailure(ctx, 'PROCESS', e.message, { file: record.path });
                            }
                        }
                        else {
                            // Fallback for non-file records from file connector (rare)
                            processedDocuments.push({
                                id: `doc-${Date.now()}-${Math.random()}`,
                                tenantId: ctx.tenantId,
                                text: record.text || JSON.stringify(record),
                                metadata: record
                            });
                        }
                    }
                }
                else {
                    // Default mapping for other sources (API, etc)
                    processedDocuments = rawRecords.map(r => ({
                        id: r.id || `doc-${Date.now()}-${Math.random()}`,
                        tenantId: ctx.tenantId,
                        text: typeof r === 'string' ? r : JSON.stringify(r),
                        metadata: r
                    }));
                }
                // 3. Normalize
                let normalized = { entities: [], edges: [], documents: processedDocuments };
                if (config.stages.includes('normalize')) {
                    try {
                        // Merge with existing logic if any
                        const res = await this.normalizationService.normalize(rawRecords, ctx);
                        normalized.entities.push(...res.entities);
                        normalized.edges.push(...res.edges);
                        // We keep our processed documents
                    }
                    catch (e) {
                        await this.dlqService.recordFailure(ctx, 'NORMALIZE', e.message, { count: rawRecords.length });
                        continue;
                    }
                }
                // 4. Enrich
                let enriched = normalized;
                if (config.stages.includes('enrich')) {
                    try {
                        enriched = await this.enrichmentService.enrich(normalized, ctx);
                    }
                    catch (e) {
                        await this.dlqService.recordFailure(ctx, 'ENRICH', e.message, { count: normalized.documents.length });
                        continue;
                    }
                }
                // 5. Index (Chunk -> Embed -> Index)
                if (config.stages.includes('index')) {
                    try {
                        let chunks = [];
                        // Chunking
                        for (const doc of enriched.documents) {
                            chunks.push(...this.chunkingService.chunkDocument(doc));
                        }
                        // Embedding (New Stage)
                        if (chunks.length > 0) {
                            chunks = await this.embeddingStage.embedChunks(chunks, ctx);
                        }
                        await this.indexingService.index({ ...enriched, chunks }, ctx);
                    }
                    catch (e) {
                        await this.dlqService.recordFailure(ctx, 'INDEX', e.message, { count: enriched.documents.length });
                    }
                }
            }
            logger.info({ pipeline: config.key }, 'Pipeline run completed');
        }
        catch (error) {
            logger.error({ pipeline: config.key, error }, 'Pipeline run failed');
            throw error;
        }
    }
    getConnector(config) {
        switch (config.source.type) {
            case 'file':
                return new FileConnector_js_1.FileConnector(config.source.config);
            case 'api':
                return new HttpConnector_js_1.HttpConnector(config.source.config);
            default:
                throw new Error(`Unsupported source type: ${config.source.type}`);
        }
    }
}
exports.PipelineOrchestrator = PipelineOrchestrator;
