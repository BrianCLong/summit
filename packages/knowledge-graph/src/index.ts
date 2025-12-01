/**
 * @intelgraph/knowledge-graph
 * Advanced knowledge graph construction with semantic understanding
 */

// Types
export * from './types/ontology.js';
export * from './types/entity.js';

// Core managers
export { OntologyManager } from './ontology/OntologyManager.js';
export { KnowledgeGraphManager } from './core/KnowledgeGraphManager.js';

// Embeddings
export { GraphEmbeddings } from './embeddings/GraphEmbeddings.js';
export type { EmbeddingConfig, NodeEmbedding } from './embeddings/GraphEmbeddings.js';

// Temporal
export { TemporalKnowledgeGraph } from './temporal/TemporalKnowledgeGraph.js';
export type { TemporalEntity, TemporalRelationship } from './temporal/TemporalKnowledgeGraph.js';

// Fusion
export { KnowledgeFusion } from './fusion/KnowledgeFusion.js';
export type { ConflictResolutionStrategy, FusionResult } from './fusion/KnowledgeFusion.js';

// Extraction
export { ExtractionPipeline } from './extraction/ExtractionPipeline.js';
export type { Document, ExtractionPipelineConfig, ExtractionResult } from './extraction/ExtractionPipeline.js';

// Visualization
export { GraphVisualization } from './visualization/GraphVisualization.js';
export type { VisualizationOptions, GraphData } from './visualization/GraphVisualization.js';

// Re-export for convenience
export { STANDARD_NAMESPACES } from './types/ontology.js';
