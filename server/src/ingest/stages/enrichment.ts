import { BasePipelineStage, PipelineContext } from '../pipeline.js';

export class EnrichmentStage extends BasePipelineStage {
  name = 'enrichment';

  async process(ctx: PipelineContext, items: any[]): Promise<any[]> {
    ctx.logger.info(`Enriching ${items.length} items`);

    // Placeholder for actual enrichment (NER, PII, etc.)
    // For now, we just tag them as enriched
    return items.map(item => {
      if (item.metadata) {
        item.metadata._enriched = true;
      } else if (item.properties) {
        item.properties._enriched = true;
      }
      return item;
    });
  }
}
