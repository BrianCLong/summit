/**
 * @intelgraph/graphrag
 * Semantic RAG Knowledge Graph Service
 *
 * Evidence-first retrieval with graph reasoning, citations, and counterfactual analysis
 */

// Main orchestrator
export { GraphRAGOrchestrator, createGraphRAGOrchestrator } from './GraphRAGOrchestrator.js';
export type { QueryOptions, GraphRAGResponse } from './GraphRAGOrchestrator.js';

// Types
export * from './types/index.js';

// Retrievers
export { GraphRetriever } from './retrieval/GraphRetriever.js';
export type { GraphRetrieverConfig } from './retrieval/GraphRetriever.js';

export { DocumentRetriever } from './retrieval/DocumentRetriever.js';
export type { DocumentRetrieverConfig } from './retrieval/DocumentRetriever.js';

export { TemporalRetriever } from './retrieval/TemporalRetriever.js';
export type { TemporalScope, TemporalEntity, TemporalRelationship } from './retrieval/TemporalRetriever.js';

export { PolicyRetriever } from './retrieval/PolicyRetriever.js';
export type { PolicyContext, PolicyRule, RedactionRule } from './retrieval/PolicyRetriever.js';

// Citation management
export { CitationManager } from './citation/CitationManager.js';
export type { CitationLink, CitationValidation, ProvenanceRecord } from './citation/CitationManager.js';

// Context fusion
export { ContextFusion } from './fusion/ContextFusion.js';
export type { FusionConfig, ConflictInfo } from './fusion/ContextFusion.js';

// Analysis
export { CounterfactualEngine } from './analysis/CounterfactualEngine.js';
export type { Counterfactual, SensitivityAnalysis } from './analysis/CounterfactualEngine.js';

// LLM integration
export { LLMIntegration } from './llm/LLMIntegration.js';
export type { LLMConfig, LLMResponse, EmbeddingResponse } from './llm/LLMIntegration.js';
