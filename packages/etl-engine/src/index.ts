/**
 * @intelgraph/etl-engine
 * ETL/ELT execution engine with comprehensive transformation capabilities
 */

// Engine
export * from './engine/ETLEngine';
export * from './engine/ITransformer';
export * from './engine/TransformerRegistry';

// Transformers
export * from './transformers/MapTransformer';
export * from './transformers/FilterTransformer';
export * from './transformers/AggregateTransformer';

// Version
export const VERSION = '0.1.0';
