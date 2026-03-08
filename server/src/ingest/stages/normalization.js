"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NormalizationStage = void 0;
const pipeline_js_1 = require("../pipeline.js");
const crypto_1 = __importDefault(require("crypto"));
class NormalizationStage extends pipeline_js_1.BasePipelineStage {
    config;
    name = 'normalization';
    constructor(config) {
        super();
        this.config = config;
    }
    async process(ctx, records) {
        ctx.logger.info(`Normalizing ${records.length} records`);
        return records.map(record => {
            // Basic logic: if it looks like a doc, make it a doc. Else entity.
            // In a real system, we'd use the pipeline config/schema to determine this.
            const isDoc = record.text || record.content || this.config.entityType === 'document';
            if (isDoc) {
                return this.normalizeToDocument(ctx, record);
            }
            else {
                return this.normalizeToEntity(ctx, record);
            }
        });
    }
    normalizeToDocument(ctx, record) {
        return {
            id: crypto_1.default.randomUUID(),
            tenantId: ctx.tenantId,
            source: {
                system: ctx.pipeline.source.type,
                id: record.id || record.filename || crypto_1.default.randomUUID(),
                uri: record.url || record.path,
            },
            text: record.text || record.content || '',
            title: record.title || record.filename,
            metadata: { ...record, _normalized: true },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
    normalizeToEntity(ctx, record) {
        return {
            id: crypto_1.default.randomUUID(),
            tenantId: ctx.tenantId,
            kind: this.config.entityType || 'custom',
            externalRefs: [{ system: ctx.pipeline.source.type, id: record.id || crypto_1.default.randomUUID() }],
            labels: [],
            properties: { ...record },
            sourceIds: [ctx.pipeline.key],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
}
exports.NormalizationStage = NormalizationStage;
