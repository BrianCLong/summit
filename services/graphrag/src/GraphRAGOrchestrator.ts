/**
 * GraphRAG Orchestrator
 * Main service coordinating all GraphRAG components
 */

import { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  GraphRAGConfig,
  RetrievalQuery,
  RetrievalResult,
  RAGAnswer,
  EvidenceChunk,
  FusedContext,
  DEFAULT_CONFIG,
} from './types/index.js';
import { GraphRetriever } from './retrieval/GraphRetriever.js';
import { DocumentRetriever } from './retrieval/DocumentRetriever.js';
import { TemporalRetriever, TemporalScope } from './retrieval/TemporalRetriever.js';
import { PolicyRetriever, PolicyContext } from './retrieval/PolicyRetriever.js';
import { CitationManager } from './citation/CitationManager.js';
import { ContextFusion } from './fusion/ContextFusion.js';
import { CounterfactualEngine, Counterfactual, SensitivityAnalysis } from './analysis/CounterfactualEngine.js';
import { LLMIntegration, LLMConfig } from './llm/LLMIntegration.js';

const tracer = trace.getTracer('graphrag-orchestrator');

export interface QueryOptions {
  includeCounterfactuals?: boolean;
  includeSensitivityAnalysis?: boolean;
  temporalScope?: TemporalScope;
  policyContext?: PolicyContext;
  maxTokens?: number;
  temperature?: number;
}

export interface GraphRAGResponse {
  answer: RAGAnswer;
  retrievalResult: RetrievalResult;
  fusedContext: FusedContext;
  counterfactuals?: Counterfactual[];
  sensitivityAnalysis?: SensitivityAnalysis;
  metadata: {
    totalProcessingTimeMs: number;
    retrievalTimeMs: number;
    fusionTimeMs: number;
    generationTimeMs: number;
    totalCost: number;
  };
}

export class GraphRAGOrchestrator {
  private driver: Driver;
  private graphRetriever: GraphRetriever;
  private documentRetriever: DocumentRetriever;
  private temporalRetriever: TemporalRetriever;
  private policyRetriever: PolicyRetriever;
  private citationManager: CitationManager;
  private contextFusion: ContextFusion;
  private counterfactualEngine: CounterfactualEngine;
  private llm: LLMIntegration;
  private config: GraphRAGConfig;

  constructor(config: GraphRAGConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as GraphRAGConfig;

    // Initialize Neo4j driver
    this.driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
    );

    // Initialize LLM
    const llmConfig: LLMConfig = {
      provider: 'openai',
      model: config.openai.model,
      embeddingModel: config.openai.embeddingModel,
      apiKey: config.openai.apiKey,
      maxTokens: config.generation.maxTokens,
      temperature: config.generation.temperature,
      topP: config.generation.topP,
      costPerInputToken: 0.00001,
      costPerOutputToken: 0.00003,
    };
    this.llm = new LLMIntegration(llmConfig);

    // Initialize retrievers
    this.graphRetriever = new GraphRetriever(this.driver, {
      maxHops: config.retrieval.maxHops,
      maxNodes: config.retrieval.maxNodes,
      minRelevance: config.retrieval.minRelevance,
    });

    this.documentRetriever = new DocumentRetriever(
      config.openai.apiKey,
      config.redis.url,
      {
        maxDocuments: config.retrieval.maxDocuments,
        minRelevance: config.retrieval.minRelevance,
      },
    );

    this.temporalRetriever = new TemporalRetriever(this.driver);
    this.policyRetriever = new PolicyRetriever(
      this.driver,
      config.policy.opaEndpoint,
    );

    // Initialize other components
    this.citationManager = new CitationManager(this.driver);
    this.contextFusion = new ContextFusion({
      maxTokens: config.generation.maxTokens * 2,
    });
    this.counterfactualEngine = new CounterfactualEngine(this.driver, this.llm);
  }

  /**
   * Main query method - orchestrates the full RAG pipeline
   */
  async query(
    query: RetrievalQuery,
    options: QueryOptions = {},
  ): Promise<GraphRAGResponse> {
    return tracer.startActiveSpan('graphrag_query', async (span) => {
      const startTime = Date.now();
      const timings = {
        retrieval: 0,
        fusion: 0,
        generation: 0,
      };

      try {
        span.setAttribute('query.length', query.query.length);
        span.setAttribute('query.tenantId', query.tenantId);

        // Phase 1: Retrieval
        const retrievalStart = Date.now();
        const retrievalResult = await this.performRetrieval(query, options);
        timings.retrieval = Date.now() - retrievalStart;
        span.setAttribute('retrieval.timeMs', timings.retrieval);
        span.setAttribute('retrieval.chunks', retrievalResult.evidenceChunks.length);

        // Phase 2: Policy enforcement
        let evidenceChunks = retrievalResult.evidenceChunks;
        if (options.policyContext) {
          const policyResult = await this.policyRetriever.retrieveWithPolicy(
            evidenceChunks,
            options.policyContext,
          );
          evidenceChunks = [...policyResult.allowed, ...policyResult.redacted];
          span.setAttribute('policy.denied', policyResult.denied.length);
        }

        // Phase 3: Context fusion
        const fusionStart = Date.now();
        const fusedContext = await this.performFusion(evidenceChunks, options);
        timings.fusion = Date.now() - fusionStart;
        span.setAttribute('fusion.timeMs', timings.fusion);

        // Phase 4: Answer generation
        const generationStart = Date.now();
        const answer = await this.generateAnswer(query, evidenceChunks, options);
        timings.generation = Date.now() - generationStart;
        span.setAttribute('generation.timeMs', timings.generation);

        // Phase 5: Optional counterfactuals
        let counterfactuals: Counterfactual[] | undefined;
        let sensitivityAnalysis: SensitivityAnalysis | undefined;

        if (options.includeCounterfactuals) {
          counterfactuals = await this.counterfactualEngine.generateCounterfactuals(
            answer,
            evidenceChunks,
          );
          span.setAttribute('counterfactuals.count', counterfactuals.length);
        }

        if (options.includeSensitivityAnalysis) {
          sensitivityAnalysis = await this.counterfactualEngine.analyzeSensitivity(
            answer,
            evidenceChunks,
          );
          span.setAttribute('sensitivity.robustness', sensitivityAnalysis.robustnessScore);
        }

        const totalTime = Date.now() - startTime;
        span.setAttribute('total.timeMs', totalTime);
        span.setStatus({ code: SpanStatusCode.OK });

        return {
          answer,
          retrievalResult,
          fusedContext,
          counterfactuals,
          sensitivityAnalysis,
          metadata: {
            totalProcessingTimeMs: totalTime,
            retrievalTimeMs: timings.retrieval,
            fusionTimeMs: timings.fusion,
            generationTimeMs: timings.generation,
            totalCost: this.llm.getTotalCost(),
          },
        };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Perform multi-source retrieval
   */
  private async performRetrieval(
    query: RetrievalQuery,
    options: QueryOptions,
  ): Promise<RetrievalResult> {
    // Run retrievers in parallel
    const [graphResult, documentChunks, temporalChunks] = await Promise.all([
      this.graphRetriever.retrieve(query),
      this.documentRetriever.retrieve(query),
      options.temporalScope
        ? this.temporalRetriever.retrieve(query, options.temporalScope)
        : Promise.resolve([]),
    ]);

    // Merge evidence chunks
    const allChunks = [
      ...graphResult.evidenceChunks,
      ...documentChunks,
      ...temporalChunks,
    ];

    // Deduplicate and rank
    const rankedChunks = this.rankAndDeduplicateChunks(allChunks);

    return {
      ...graphResult,
      evidenceChunks: rankedChunks,
      totalDocumentsSearched: documentChunks.length,
    };
  }

  /**
   * Perform context fusion
   */
  private async performFusion(
    evidenceChunks: EvidenceChunk[],
    options: QueryOptions,
  ): Promise<FusedContext> {
    const graphEvidence = evidenceChunks.filter((c) =>
      c.citations.some((ci) => ci.sourceType === 'graph'),
    );
    const documentEvidence = evidenceChunks.filter((c) =>
      c.citations.some((ci) => ci.sourceType === 'document'),
    );
    const temporalEvidence = evidenceChunks.filter((c) => c.temporalContext);

    return this.contextFusion.fuse(graphEvidence, documentEvidence, temporalEvidence);
  }

  /**
   * Generate answer from evidence
   */
  private async generateAnswer(
    query: RetrievalQuery,
    evidenceChunks: EvidenceChunk[],
    options: QueryOptions,
  ): Promise<RAGAnswer> {
    return this.llm.generateAnswer(query.query, evidenceChunks, {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      includeReasoning: true,
    });
  }

  /**
   * Rank and deduplicate evidence chunks
   */
  private rankAndDeduplicateChunks(chunks: EvidenceChunk[]): EvidenceChunk[] {
    const seen = new Set<string>();
    const unique: EvidenceChunk[] = [];

    // Sort by relevance
    const sorted = [...chunks].sort((a, b) => b.relevanceScore - a.relevanceScore);

    for (const chunk of sorted) {
      // Simple deduplication by content hash
      const hash = this.hashContent(chunk.content);
      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(chunk);
      }
    }

    return unique;
  }

  /**
   * Hash content for deduplication
   */
  private hashContent(content: string): string {
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
    let hash = 0;
    for (let i = 0; i < Math.min(normalized.length, 200); i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Index a document for retrieval
   */
  async indexDocument(
    documentId: string,
    title: string,
    content: string,
    tenantId: string,
    metadata: Record<string, any> = {},
  ): Promise<number> {
    return this.documentRetriever.indexDocument(
      documentId,
      title,
      content,
      tenantId,
      metadata,
    );
  }

  /**
   * Generate Cypher from natural language
   */
  async naturalLanguageToCypher(
    naturalLanguage: string,
    tenantId: string,
  ): Promise<{
    cypher: string;
    explanation: string;
    confidence: number;
    warnings: string[];
  }> {
    // Get schema from database
    const schema = await this.getGraphSchema();
    return this.llm.generateCypher(naturalLanguage, schema);
  }

  /**
   * Get graph schema for Cypher generation
   */
  private async getGraphSchema(): Promise<{
    nodeTypes: string[];
    relationshipTypes: string[];
    properties: Record<string, string[]>;
  }> {
    const session = this.driver.session();
    try {
      const [nodeResult, relResult] = await Promise.all([
        session.run('CALL db.labels()'),
        session.run('CALL db.relationshipTypes()'),
      ]);

      return {
        nodeTypes: nodeResult.records.map((r) => r.get(0)),
        relationshipTypes: relResult.records.map((r) => r.get(0)),
        properties: {
          Entity: ['id', 'name', 'type', 'confidence', 'tenantId'],
          Document: ['id', 'title', 'content', 'source'],
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: Record<string, boolean>;
  }> {
    const components: Record<string, boolean> = {};

    // Check Neo4j
    try {
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      components.neo4j = true;
    } catch {
      components.neo4j = false;
    }

    // Check LLM
    try {
      await this.llm.embed('health check');
      components.llm = true;
    } catch {
      components.llm = false;
    }

    return {
      healthy: Object.values(components).every((v) => v),
      components,
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.driver.close();
    await this.documentRetriever.close();
  }
}

// Factory function
export function createGraphRAGOrchestrator(config: GraphRAGConfig): GraphRAGOrchestrator {
  return new GraphRAGOrchestrator(config);
}
