/**
 * GraphRAGQueryService - Orchestrates the complete GraphRAG query flow with preview
 *
 * Features:
 * - Natural language query → preview → execute workflow
 * - Integration with existing GraphRAGService for RAG retrieval
 * - Citation resolution and inline references
 * - Glass-box run capture for full observability
 * - Query editing and re-execution support
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import { logger } from '../utils/logger.js';
import { metrics } from '../observability/metrics.js';
import { GraphRAGService, type GraphRAGRequest, type GraphRAGResponse } from './GraphRAGService.js';
import { QueryPreviewService, type CreatePreviewInput, type QueryPreview, type ExecutePreviewResult } from './QueryPreviewService.js';
import { GlassBoxRunService, type GlassBoxRun } from './GlassBoxRunService.js';
import { NlToCypherService } from '../ai/nl-to-cypher/nl-to-cypher.service.js';

export type GraphRAGQueryRequest = {
  investigationId: string;
  tenantId: string;
  userId: string;
  question: string;
  focusEntityIds?: string[];
  maxHops?: number;
  // Query generation options
  generateQueryPreview?: boolean; // If true, return preview before execution
  autoExecute?: boolean; // If false, require explicit execution step
  // Execution options
  maxRows?: number;
  timeout?: number;
};

export type EnrichedCitation = {
  entityId: string;
  entityKind?: string;
  entityLabels?: string[];
  entityName?: string;
  snippetText?: string;
  confidence?: number;
  sourceUrl?: string;
};

export type GraphRAGQueryResponse = {
  answer: string;
  confidence: number;
  citations: EnrichedCitation[];
  why_paths?: GraphRAGResponse['why_paths'];
  // Preview info (if preview was generated)
  preview?: {
    id: string;
    generatedQuery: string;
    queryExplanation: string;
    costLevel: string;
    riskLevel: string;
    canExecute: boolean;
    requiresApproval: boolean;
  };
  // Execution metadata
  runId: string;
  executionTimeMs: number;
  subgraphSize?: {
    nodeCount: number;
    edgeCount: number;
  };
};

export type ExecutePreviewRequest = {
  previewId: string;
  userId: string;
  useEditedQuery?: boolean;
  dryRun?: boolean;
  maxRows?: number;
  timeout?: number;
};

export class GraphRAGQueryService {
  private graphRAGService: GraphRAGService;
  private queryPreviewService: QueryPreviewService;
  private glassBoxService: GlassBoxRunService;
  private pool: Pool;
  private neo4jDriver: Driver;

  constructor(
    graphRAGService: GraphRAGService,
    queryPreviewService: QueryPreviewService,
    glassBoxService: GlassBoxRunService,
    pool: Pool,
    neo4jDriver: Driver
  ) {
    this.graphRAGService = graphRAGService;
    this.queryPreviewService = queryPreviewService;
    this.glassBoxService = glassBoxService;
    this.pool = pool;
    this.neo4jDriver = neo4jDriver;
  }

  /**
   * Main query method - handles the full flow from NL query to answer with citations
   */
  async query(request: GraphRAGQueryRequest): Promise<GraphRAGQueryResponse> {
    const startTime = Date.now();

    metrics.featureUsageTotal.inc({ tenant_id: request.tenantId, feature_name: 'graphrag_query' });

    logger.info({
      investigationId: request.investigationId,
      question: request.question,
      generatePreview: request.generateQueryPreview,
      autoExecute: request.autoExecute,
    }, 'Starting GraphRAG query');

    // Create glass-box run for observability
    const run = await this.glassBoxService.createRun({
      investigationId: request.investigationId,
      tenantId: request.tenantId,
      userId: request.userId,
      type: 'graphrag_query',
      prompt: request.question,
      parameters: {
        focusEntityIds: request.focusEntityIds,
        maxHops: request.maxHops,
        generatePreview: request.generateQueryPreview,
        autoExecute: request.autoExecute,
      },
    });

    try {
      await this.glassBoxService.updateStatus(run.id, 'running');

      let preview: QueryPreview | undefined;

      // Step 1: Generate query preview if requested
      if (request.generateQueryPreview) {
        const previewStepId = await this.captureStep(
          run.id,
          'Generate query preview from natural language'
        );

        preview = await this.queryPreviewService.createPreview({
          investigationId: request.investigationId,
          tenantId: request.tenantId,
          userId: request.userId,
          naturalLanguageQuery: request.question,
          language: 'cypher',
          parameters: {
            focusEntityIds: request.focusEntityIds,
            maxHops: request.maxHops,
          },
          focusEntityIds: request.focusEntityIds,
          maxHops: request.maxHops,
        });

        await this.glassBoxService.completeStep(run.id, previewStepId, {
          previewId: preview.id,
          costLevel: preview.costEstimate.level,
          riskLevel: preview.riskAssessment.level,
          canExecute: preview.canExecute,
        });

        // If not auto-executing, return preview for user review
        if (!request.autoExecute) {
          await this.glassBoxService.updateStatus(run.id, 'completed', {
            previewGenerated: true,
            requiresExplicitExecution: true,
          });

          return {
            answer: '',
            confidence: 0,
            citations: [],
            preview: {
              id: preview.id,
              generatedQuery: preview.generatedQuery,
              queryExplanation: preview.queryExplanation,
              costLevel: preview.costEstimate.level,
              riskLevel: preview.riskAssessment.level,
              canExecute: preview.canExecute,
              requiresApproval: preview.requiresApproval,
            },
            runId: run.id,
            executionTimeMs: Date.now() - startTime,
          };
        }

        // Check if we can execute
        if (!preview.canExecute) {
          throw new Error(
            `Query cannot be executed: ${preview.validationErrors.join(', ')}`
          );
        }

        if (preview.requiresApproval) {
          logger.warn({
            previewId: preview.id,
            costLevel: preview.costEstimate.level,
            riskLevel: preview.riskAssessment.level,
          }, 'Query requires approval but auto-execute is true');
        }
      }

      // Step 2: Execute GraphRAG query
      const ragStepId = await this.captureStep(
        run.id,
        'Execute GraphRAG retrieval and generation'
      );

      const ragRequest: GraphRAGRequest = {
        investigationId: request.investigationId,
        question: request.question,
        focusEntityIds: request.focusEntityIds,
        maxHops: request.maxHops || 2,
      };

      const ragResponse = await this.graphRAGService.answer(ragRequest);

      await this.glassBoxService.completeStep(run.id, ragStepId, {
        confidence: ragResponse.confidence,
        citationCount: ragResponse.citations.entityIds.length,
        pathCount: ragResponse.why_paths?.length,
      });

      // Step 3: Enrich citations with entity details
      const enrichStepId = await this.captureStep(
        run.id,
        'Enrich citations with entity details'
      );

      const enrichedCitations = await this.enrichCitations(
        ragResponse.citations.entityIds,
        request.investigationId
      );

      await this.glassBoxService.completeStep(run.id, enrichStepId, {
        enrichedCount: enrichedCitations.length,
      });

      // Step 4: Get subgraph size for metadata
      const subgraphSize = await this.getSubgraphSize(
        request.investigationId,
        request.focusEntityIds
      );

      const executionTimeMs = Date.now() - startTime;

      const response: GraphRAGQueryResponse = {
        answer: ragResponse.answer,
        confidence: ragResponse.confidence,
        citations: enrichedCitations,
        why_paths: ragResponse.why_paths,
        preview: preview
          ? {
              id: preview.id,
              generatedQuery: preview.generatedQuery,
              queryExplanation: preview.queryExplanation,
              costLevel: preview.costEstimate.level,
              riskLevel: preview.riskAssessment.level,
              canExecute: preview.canExecute,
              requiresApproval: preview.requiresApproval,
            }
          : undefined,
        runId: run.id,
        executionTimeMs,
        subgraphSize,
      };

      await this.glassBoxService.updateStatus(run.id, 'completed', response);

      metrics.graphragQueryTotal.inc({ status: 'success', hasPreview: !!preview });
      metrics.graphragQueryDurationMs.observe(
        { hasPreview: !!preview },
        executionTimeMs
      );

      logger.info({
        runId: run.id,
        investigationId: request.investigationId,
        confidence: ragResponse.confidence,
        citationCount: enrichedCitations.length,
        executionTimeMs,
        hasPreview: !!preview,
      }, 'Completed GraphRAG query');

      return response;
    } catch (error) {
      await this.glassBoxService.updateStatus(run.id, 'failed', undefined, String(error));

      metrics.graphragQueryTotal.inc({ status: 'failed' });

      logger.error({
        error,
        runId: run.id,
        request,
      }, 'Failed to execute GraphRAG query');

      throw error;
    }
  }

  /**
   * Execute a previously created preview
   */
  async executePreview(request: ExecutePreviewRequest): Promise<GraphRAGQueryResponse> {
    const startTime = Date.now();

    const preview = await this.queryPreviewService.getPreview(request.previewId);
    if (!preview) {
      throw new Error(`Preview ${request.previewId} not found`);
    }

    logger.info({
      previewId: request.previewId,
      investigationId: preview.investigationId,
      useEditedQuery: request.useEditedQuery,
      dryRun: request.dryRun,
    }, 'Executing preview');

    // Execute the preview (this creates its own glass-box run internally)
    const execResult = await this.queryPreviewService.executePreview({
      previewId: request.previewId,
      userId: request.userId,
      useEditedQuery: request.useEditedQuery,
      dryRun: request.dryRun,
      maxRows: request.maxRows,
      timeout: request.timeout,
    });

    // If dry run, return empty response
    if (request.dryRun) {
      return {
        answer: 'Dry run - query validated but not executed',
        confidence: 0,
        citations: [],
        runId: execResult.runId,
        executionTimeMs: execResult.executionTimeMs,
      };
    }

    // Now execute GraphRAG with the original question
    const ragRequest: GraphRAGRequest = {
      investigationId: preview.investigationId,
      question: preview.naturalLanguageQuery,
      focusEntityIds: preview.parameters.focusEntityIds as string[] | undefined,
      maxHops: preview.parameters.maxHops as number | undefined,
    };

    const ragResponse = await this.graphRAGService.answer(ragRequest);

    // Enrich citations
    const enrichedCitations = await this.enrichCitations(
      ragResponse.citations.entityIds,
      preview.investigationId
    );

    const response: GraphRAGQueryResponse = {
      answer: ragResponse.answer,
      confidence: ragResponse.confidence,
      citations: enrichedCitations,
      why_paths: ragResponse.why_paths,
      preview: {
        id: preview.id,
        generatedQuery: request.useEditedQuery && preview.editedQuery
          ? preview.editedQuery
          : preview.generatedQuery,
        queryExplanation: preview.queryExplanation,
        costLevel: preview.costEstimate.level,
        riskLevel: preview.riskAssessment.level,
        canExecute: preview.canExecute,
        requiresApproval: preview.requiresApproval,
      },
      runId: execResult.runId,
      executionTimeMs: Date.now() - startTime,
    };

    logger.info({
      previewId: request.previewId,
      runId: execResult.runId,
      citationCount: enrichedCitations.length,
      executionTimeMs: response.executionTimeMs,
    }, 'Executed preview successfully');

    return response;
  }

  /**
   * Get a run by ID with full details
   */
  async getRun(runId: string): Promise<GlassBoxRun | null> {
    return this.glassBoxService.getRun(runId);
  }

  /**
   * Replay a run with optional modifications
   */
  async replayRun(
    runId: string,
    userId: string,
    options?: {
      modifiedQuestion?: string;
      modifiedParameters?: Record<string, unknown>;
      skipCache?: boolean;
    }
  ): Promise<GraphRAGQueryResponse> {
    const originalRun = await this.glassBoxService.getRun(runId);
    if (!originalRun) {
      throw new Error(`Run ${runId} not found`);
    }

    logger.info({
      originalRunId: runId,
      userId,
      hasModifications: !!(options?.modifiedQuestion || options?.modifiedParameters),
    }, 'Replaying run');

    // Create replay run
    const replayRun = await this.glassBoxService.replayRun(runId, userId, {
      modifiedPrompt: options?.modifiedQuestion,
      modifiedParameters: options?.modifiedParameters,
      skipCache: options?.skipCache,
    });

    // Execute with replay parameters
    const request: GraphRAGQueryRequest = {
      investigationId: originalRun.investigationId,
      tenantId: originalRun.tenantId,
      userId,
      question: options?.modifiedQuestion || originalRun.prompt,
      focusEntityIds: options?.modifiedParameters?.focusEntityIds as string[] | undefined
        || originalRun.parameters.focusEntityIds as string[] | undefined,
      maxHops: options?.modifiedParameters?.maxHops as number | undefined
        || originalRun.parameters.maxHops as number | undefined,
      generateQueryPreview: originalRun.parameters.generatePreview as boolean | undefined,
      autoExecute: true,
    };

    return this.query(request);
  }

  /**
   * List runs for an investigation
   */
  async listRuns(
    investigationId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    }
  ): Promise<{ runs: GlassBoxRun[]; total: number }> {
    return this.glassBoxService.listRuns(investigationId, {
      type: 'graphrag_query',
      ...options,
    });
  }

  /**
   * Get replay history for a run
   */
  async getReplayHistory(runId: string): Promise<GlassBoxRun[]> {
    return this.glassBoxService.getReplayHistory(runId);
  }

  /**
   * Enrich citations with entity details
   */
  private async enrichCitations(
    entityIds: string[],
    investigationId: string
  ): Promise<EnrichedCitation[]> {
    if (entityIds.length === 0) {
      return [];
    }

    const query = `
      SELECT
        e.id,
        e.kind,
        e.labels,
        e.props->>'name' as name,
        e.props->>'description' as description,
        e.props->>'url' as source_url,
        e.props->>'confidence' as confidence
      FROM entities e
      WHERE e.id = ANY($1)
      AND e.props->>'investigationId' = $2
      ORDER BY array_position($1, e.id)
    `;

    try {
      const result = await this.pool.query(query, [entityIds, investigationId]);

      return result.rows.map(row => ({
        entityId: row.id,
        entityKind: row.kind,
        entityLabels: row.labels || [],
        entityName: row.name || row.id,
        snippetText: row.description
          ? this.truncateText(row.description, 200)
          : undefined,
        confidence: row.confidence ? parseFloat(row.confidence) : undefined,
        sourceUrl: row.source_url,
      }));
    } catch (error) {
      logger.error({
        error,
        entityIds,
        investigationId,
      }, 'Failed to enrich citations');

      // Return basic citations on error
      return entityIds.map(id => ({
        entityId: id,
      }));
    }
  }

  /**
   * Get subgraph size for metadata
   */
  private async getSubgraphSize(
    investigationId: string,
    focusEntityIds?: string[]
  ): Promise<{ nodeCount: number; edgeCount: number } | undefined> {
    const session = this.neo4jDriver.session();

    try {
      let query: string;
      let params: Record<string, unknown>;

      if (focusEntityIds && focusEntityIds.length > 0) {
        query = `
          MATCH (anchor:Entity)
          WHERE anchor.id IN $focusIds
            AND anchor.investigationId = $investigationId
          CALL apoc.path.subgraphAll(anchor, {
            maxLevel: 2,
            relationshipFilter: 'REL>',
            labelFilter: 'Entity'
          })
          YIELD nodes, relationships
          RETURN size(nodes) as nodeCount, size(relationships) as edgeCount
        `;
        params = { focusIds: focusEntityIds, investigationId };
      } else {
        query = `
          MATCH (e:Entity {investigationId: $investigationId})
          WITH count(e) as nodeCount
          MATCH ()-[r:REL]->()
          WHERE r.investigationId = $investigationId
          WITH nodeCount, count(r) as edgeCount
          RETURN nodeCount, edgeCount
        `;
        params = { investigationId };
      }

      const result = await session.run(query, params);

      if (result.records.length > 0) {
        return {
          nodeCount: result.records[0].get('nodeCount').toNumber(),
          edgeCount: result.records[0].get('edgeCount').toNumber(),
        };
      }

      return undefined;
    } catch (error) {
      logger.error({
        error,
        investigationId,
      }, 'Failed to get subgraph size');
      return undefined;
    } finally {
      await session.close();
    }
  }

  /**
   * Capture a step in the glass-box run
   */
  private async captureStep(runId: string, description: string): Promise<string> {
    const stepId = require('uuid').v4();
    await this.glassBoxService.addStep(runId, {
      type: 'tool_call',
      description,
    });
    return stepId;
  }

  /**
   * Truncate text to max length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}
