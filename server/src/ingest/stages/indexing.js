"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexingStage = void 0;
// @ts-nocheck
const pipeline_js_1 = require("../pipeline.js");
const pg_js_1 = require("../../db/pg.js");
class IndexingStage extends pipeline_js_1.BasePipelineStage {
    name = 'indexing';
    async process(ctx, items) {
        ctx.logger.info(`Indexing ${items.length} items`);
        const entities = items.filter(i => 'kind' in i);
        const documents = items.filter(i => 'text' in i);
        if (entities.length > 0) {
            await this.saveEntities(ctx, entities);
        }
        if (documents.length > 0) {
            await this.saveDocuments(ctx, documents);
        }
        return items;
    }
    async saveEntities(ctx, entities) {
        // Bulk insert entities
        // Using a simple loop for MVP, but should be batched/COPY in prod
        for (const entity of entities) {
            await pg_js_1.pg.none(`INSERT INTO entities (id, tenant_id, kind, external_refs, labels, properties, source_ids, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           properties = entities.properties || EXCLUDED.properties,
           updated_at = NOW()`, [
                entity.id,
                entity.tenantId,
                entity.kind,
                JSON.stringify(entity.externalRefs),
                entity.labels,
                JSON.stringify(entity.properties),
                entity.sourceIds,
                entity.createdAt,
                entity.updatedAt
            ]);
        }
    }
    async saveDocuments(ctx, documents) {
        for (const doc of documents) {
            await pg_js_1.pg.none(`INSERT INTO documents (id, tenant_id, title, mime_type, source, text, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           text = EXCLUDED.text,
           metadata = documents.metadata || EXCLUDED.metadata,
           updated_at = NOW()`, [
                doc.id,
                doc.tenantId,
                doc.title,
                doc.mimeType,
                JSON.stringify(doc.source),
                doc.text,
                JSON.stringify(doc.metadata),
                doc.createdAt,
                doc.updatedAt
            ]);
        }
    }
}
exports.IndexingStage = IndexingStage;
