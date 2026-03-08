"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichmentStage = void 0;
const pipeline_js_1 = require("../pipeline.js");
class EnrichmentStage extends pipeline_js_1.BasePipelineStage {
    name = 'enrichment';
    async process(ctx, items) {
        ctx.logger.info(`Enriching ${items.length} items`);
        // Placeholder for actual enrichment (NER, PII, etc.)
        // For now, we just tag them as enriched
        return items.map(item => {
            if (item.metadata) {
                item.metadata._enriched = true;
            }
            else if (item.properties) {
                item.properties._enriched = true;
            }
            return item;
        });
    }
}
exports.EnrichmentStage = EnrichmentStage;
