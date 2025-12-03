/**
 * Multimodal Fusion Pipeline
 * Agentic fusion of OSINT text/images/video into Neo4j embeddings
 *
 * @module @intelgraph/multimodal-fusion
 */

// Core Types
export * from './types.js';

// Pipeline Components
export { CLIPPipeline } from './clip-pipeline.js';
export type { CLIPPipelineConfig } from './clip-pipeline.js';

export { TextPipeline } from './text-pipeline.js';
export type { TextPipelineConfig } from './text-pipeline.js';

export { VideoPipeline } from './video-pipeline.js';
export type { VideoPipelineConfig } from './video-pipeline.js';

// Fusion Orchestration
export { FusionOrchestrator } from './fusion-orchestrator.js';
export type { FusionOrchestratorConfig } from './fusion-orchestrator.js';

// Storage and Retrieval
export { PgVectorStore } from './pgvector-store.js';
export type { PgVectorStoreConfig } from './pgvector-store.js';

export { Neo4jEmbeddings } from './neo4j-embeddings.js';
export type { Neo4jEmbeddingsConfig } from './neo4j-embeddings.js';

// Hallucination Detection
export { HallucinationGuard } from './hallucination-guard.js';
export type { HallucinationGuardConfig } from './hallucination-guard.js';

// Convenience factory function
import { FusionOrchestrator, FusionOrchestratorConfig } from './fusion-orchestrator.js';

/**
 * Create a pre-configured fusion pipeline for OSINT analysis
 */
export function createOSINTFusionPipeline(
  config: Partial<FusionOrchestratorConfig> = {},
): FusionOrchestrator {
  return new FusionOrchestrator({
    fusionMethod: 'weighted_average',
    targetDimension: 768,
    enableGraphEmbeddings: true,
    enablePgVectorStorage: true,
    enableHallucinationGuard: true,
    hallucinationThreshold: 0.7,
    crossModalThreshold: 0.6,
    parallelProcessing: true,
    maxConcurrency: 4,
    ...config,
  });
}

/**
 * Create a lightweight fusion pipeline (no external dependencies)
 */
export function createLightweightFusionPipeline(
  config: Partial<FusionOrchestratorConfig> = {},
): FusionOrchestrator {
  return new FusionOrchestrator({
    fusionMethod: 'average',
    targetDimension: 768,
    enableGraphEmbeddings: false,
    enablePgVectorStorage: false,
    enableHallucinationGuard: true,
    parallelProcessing: true,
    maxConcurrency: 2,
    ...config,
  });
}

// Default export
export default FusionOrchestrator;
