/**
 * ETL Transformers
 * Export all available transformers
 */

export * from './base.js';
export * from './schema-mapper.js';
export * from './deduplicator.js';
export * from './temporal-normalizer.js';

import { TransformerFactory } from './base.js';
import { SchemaMapperTransformer } from './schema-mapper.js';
import { DeduplicatorTransformer } from './deduplicator.js';
import { TemporalNormalizerTransformer } from './temporal-normalizer.js';

/**
 * Register all transformers with the factory
 */
export function registerAllTransformers(): void {
  TransformerFactory.register('NORMALIZE_SCHEMA', SchemaMapperTransformer);
  TransformerFactory.register('MAP', SchemaMapperTransformer);
  TransformerFactory.register('DEDUPLICATE', DeduplicatorTransformer);
  TransformerFactory.register('NORMALIZE_TEMPORAL', TemporalNormalizerTransformer);
}

// Auto-register transformers on import
registerAllTransformers();
