/**
 * AI Copilot Orchestrator
 *
 * Unified orchestration layer for all AI Copilot capabilities:
 * 1. Natural Language → Graph Query (NL2Cypher)
 * 2. GraphRAG - Retrieval Augmented Generation over graphs
 * 3. Query Preview & Sandbox Execution
 * 4. Citation & Provenance Tracking
 * 5. Redaction & Policy Enforcement
 * 6. Guardrails & Safety
 *
 * This service provides a single API for all AI-powered analyst workflows.
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import { logger } from '../utils/logger.js';
import { metrics } from '../observability/metrics.js';
import { GraphRAGQueryServiceEnhanced, type GraphRAGQueryRequestEnhanced, type GraphRAGQueryResponseEnhanced } from './GraphRAGQueryServiceEnhanced.js';
import { NLToCypherService, type NLQueryInput, type CypherResult } from './NLToCypherService.js';
import { QueryPreviewService } from './QueryPreviewService.js';
import { GlassBoxRunService } from './GlassBoxRunService.js';

export type CopilotMode = 'nl2cypher' | 'graphrag' | 'auto';

export type CopilotQueryRequest = {
  investigationId: string;
  tenantId: string;
  userId: string;
  question: string;

  // Mode selection
  mode?: CopilotMode; // If 'auto', orchestrator determines best mode

  // Common options
  focusEntityIds?: string[];
  maxHops?: number;

  // Redaction & Security
  redactionPolicy?: GraphRAGQueryRequestEnhanced['redactionPolicy'];
  enableGuardrails?: boolean;
  riskTolerance?: 'low' | 'medium' | 'high';

  // Provenance
  provenanceContext?: GraphRAGQueryRequestEnhanced['provenanceContext'];
  registerClaim?: boolean;

  // Preview & Execution
  generateQueryPreview?: boolean;
  autoExecute?: boolean;
  dryRun?: boolean;

  // Execution limits
  maxRows?: number;
  timeout?: number;
};

export type CopilotQueryResponse = {
  mode: CopilotMode;
  result: GraphRAGQueryResponseEnhanced | CypherResult;
  executionTimeMs: number;
  runId: string;

  // Mode selection metadata (if auto mode)
  modeSelectionReasoning?: string;
  alternativeModes?: Array<{
    mode: CopilotMode;
    confidence: number;
    reason: string;
  }>;
};

export class AICopilotOrchestrator {
  private graphRAGService: GraphRAGQueryServiceEnhanced;
  private nl2CypherService: NLToCypherService;
  private queryPreviewService: QueryPreviewService;
  private glassBoxService: GlassBoxRunService;
  private pool: Pool;
  private neo4jDriver: Driver;
  private redis?: Redis;

  constructor(
    graphRAGService: GraphRAGQueryServiceEnhanced,
    nl2CypherService: NLToCypherService,
    queryPreviewService: QueryPreviewService,
    glassBoxService: GlassBoxRunService,
    pool: Pool,
    neo4jDriver: Driver,
    redis?: Redis
  ) {
    this.graphRAGService = graphRAGService;
    this.nl2CypherService = nl2CypherService;
    this.queryPreviewService = queryPreviewService;
    this.glassBoxService = glassBoxService;
    this.pool = pool;
    this.neo4jDriver = neo4jDriver;
    this.redis = redis;
  }

  /**
   * Main query method - intelligently routes to appropriate service
   */
  async query(request: CopilotQueryRequest): Promise<CopilotQueryResponse> {
    const startTime = Date.now();

    logger.info({
      investigationId: request.investigationId,
      question: request.question,
      mode: request.mode || 'auto',
      dryRun: request.dryRun,
    }, 'AI Copilot query initiated');

    // Determine mode if auto
    const mode = request.mode === 'auto' || !request.mode
      ? await this.determineMode(request)
      : request.mode;

    let result: GraphRAGQueryResponseEnhanced | CypherResult;
    let runId: string;
    let modeSelectionReasoning: string | undefined;

    if (mode === 'graphrag') {
      // Use GraphRAG for natural language questions requiring contextual answers
      logger.info({ mode: 'graphrag' }, 'Routing to GraphRAG service');

      const graphRAGRequest: GraphRAGQueryRequestEnhanced = {
        investigationId: request.investigationId,
        tenantId: request.tenantId,
        userId: request.userId,
        question: request.question,
        focusEntityIds: request.focusEntityIds,
        maxHops: request.maxHops,
        redactionPolicy: request.redactionPolicy,
        provenanceContext: request.provenanceContext,
        registerClaim: request.registerClaim,
        generateQueryPreview: request.generateQueryPreview,
        autoExecute: request.autoExecute !== false, // Default true for graphrag
        enableGuardrails: request.enableGuardrails,
        riskTolerance: request.riskTolerance,
      };

      const graphRAGResponse = await this.graphRAGService.query(graphRAGRequest);
      result = graphRAGResponse;
      runId = graphRAGResponse.runId;
      modeSelectionReasoning = request.mode === 'auto'
        ? 'Question appears to require contextual understanding and natural language response'
        : undefined;

    } else if (mode === 'nl2cypher') {
      // Use NL2Cypher for structured queries and data retrieval
      logger.info({ mode: 'nl2cypher' }, 'Routing to NL2Cypher service');

      const nl2cypherRequest: NLQueryInput = {
        query: request.question,
        investigationId: request.investigationId,
        userId: request.userId,
        dryRun: request.dryRun || !request.autoExecute,
      };

      const cypherResult = await this.nl2CypherService.translateQuery(nl2cypherRequest);
      result = cypherResult;
      runId = cypherResult.auditId || 'nl2cypher-' + Date.now();
      modeSelectionReasoning = request.mode === 'auto'
        ? 'Question appears to be a structured query requesting specific data'
        : undefined;

    } else {
      throw new Error(`Unsupported mode: ${mode}`);
    }

    const executionTimeMs = Date.now() - startTime;

    metrics.copilotQueryTotal.inc({
      mode,
      status: 'success',
      autoMode: request.mode === 'auto' || !request.mode,
    });
    metrics.copilotQueryDurationMs.observe({ mode }, executionTimeMs);

    logger.info({
      investigationId: request.investigationId,
      mode,
      executionTimeMs,
      runId,
    }, 'AI Copilot query completed');

    return {
      mode,
      result,
      executionTimeMs,
      runId,
      modeSelectionReasoning,
    };
  }

  /**
   * Intelligent mode selection based on query characteristics
   */
  private async determineMode(request: CopilotQueryRequest): Promise<CopilotMode> {
    const question = request.question.toLowerCase().trim();

    // Patterns that indicate NL2Cypher mode (structured queries)
    const structuredQueryPatterns = [
      /^(show|list|find|get|count|display)\s+/,
      /^how many\s+/,
      /\b(all|every)\s+(entities|relationships|nodes|edges)/,
      /\bwhere\s+.+\s*(equals?|is|are|contains?)\b/,
      /^(what|which)\s+(entities|relationships|nodes)\s+/,
      /\b(shortest|longest)\s+path\s+/,
      /\bconnected to\b/,
      /\brelated to\b/,
      /\bproperties of\b/,
    ];

    // Patterns that indicate GraphRAG mode (contextual questions)
    const contextualQueryPatterns = [
      /^(why|how|when|explain|describe|summarize|tell me about)\s+/,
      /\bwhat does .+ mean\b/,
      /\bwhat is the (significance|importance|relevance|context)\b/,
      /\bwhat are the (implications|consequences|effects)\b/,
      /\bcan you (explain|describe|summarize)\b/,
      /\bprovide (context|background|details|insights?)\b/,
      /\b(analyze|assess|evaluate)\b/,
      /\b(relationship|connection) between\b/,
    ];

    // Check for structured query patterns
    const isStructured = structuredQueryPatterns.some(pattern => pattern.test(question));

    // Check for contextual query patterns
    const isContextual = contextualQueryPatterns.some(pattern => pattern.test(question));

    // If clearly structured, use NL2Cypher
    if (isStructured && !isContextual) {
      logger.debug({
        question: request.question,
        selectedMode: 'nl2cypher',
        reason: 'Structured query pattern detected',
      }, 'Auto-selected mode');
      return 'nl2cypher';
    }

    // If clearly contextual, use GraphRAG
    if (isContextual && !isStructured) {
      logger.debug({
        question: request.question,
        selectedMode: 'graphrag',
        reason: 'Contextual query pattern detected',
      }, 'Auto-selected mode');
      return 'graphrag';
    }

    // Additional heuristics:

    // 1. Question length - longer questions tend to need contextual answers
    if (question.split(' ').length > 15) {
      logger.debug({
        question: request.question,
        selectedMode: 'graphrag',
        reason: 'Long question suggesting need for contextual answer',
      }, 'Auto-selected mode');
      return 'graphrag';
    }

    // 2. Question ends with "?" and has explanation keywords
    if (question.endsWith('?') && (
      question.includes('why') ||
      question.includes('how') ||
      question.includes('what does') ||
      question.includes('explain')
    )) {
      logger.debug({
        question: request.question,
        selectedMode: 'graphrag',
        reason: 'Explanatory question detected',
      }, 'Auto-selected mode');
      return 'graphrag';
    }

    // 3. Default to GraphRAG for ambiguous cases (safer for user experience)
    logger.debug({
      question: request.question,
      selectedMode: 'graphrag',
      reason: 'Ambiguous query - defaulting to GraphRAG for better UX',
    }, 'Auto-selected mode');
    return 'graphrag';
  }

  /**
   * Get query history for an investigation
   */
  async getQueryHistory(
    investigationId: string,
    options?: {
      limit?: number;
      offset?: number;
      mode?: CopilotMode;
    }
  ): Promise<{
    queries: Array<{
      runId: string;
      mode: CopilotMode;
      question: string;
      timestamp: Date;
      executionTimeMs: number;
      status: string;
    }>;
    total: number;
  }> {
    // Fetch from glass-box runs
    const runs = await this.glassBoxService.listRuns(investigationId, {
      type: options?.mode ? `${options.mode}_query` : undefined,
      limit: options?.limit,
      offset: options?.offset,
    });

    return {
      queries: runs.runs.map(run => ({
        runId: run.id,
        mode: this.inferModeFromRunType(run.type),
        question: run.prompt,
        timestamp: run.createdAt,
        executionTimeMs: run.completedAt
          ? new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime()
          : 0,
        status: run.status,
      })),
      total: runs.total,
    };
  }

  /**
   * Get detailed information about a specific run
   */
  async getRun(runId: string) {
    return this.glassBoxService.getRun(runId);
  }

  /**
   * Replay a previous query with optional modifications
   */
  async replayQuery(
    runId: string,
    userId: string,
    options?: {
      modifiedQuestion?: string;
      modifiedParameters?: Record<string, unknown>;
      skipCache?: boolean;
    }
  ): Promise<CopilotQueryResponse> {
    const originalRun = await this.glassBoxService.getRun(runId);
    if (!originalRun) {
      throw new Error(`Run ${runId} not found`);
    }

    logger.info({
      originalRunId: runId,
      userId,
      hasModifications: !!(options?.modifiedQuestion || options?.modifiedParameters),
    }, 'Replaying copilot query');

    // Extract original request parameters
    const mode = this.inferModeFromRunType(originalRun.type);

    const request: CopilotQueryRequest = {
      investigationId: originalRun.investigationId,
      tenantId: originalRun.tenantId,
      userId,
      question: options?.modifiedQuestion || originalRun.prompt,
      mode,
      focusEntityIds: options?.modifiedParameters?.focusEntityIds as string[] | undefined
        || originalRun.parameters.focusEntityIds as string[] | undefined,
      maxHops: options?.modifiedParameters?.maxHops as number | undefined
        || originalRun.parameters.maxHops as number | undefined,
      autoExecute: true,
    };

    return this.query(request);
  }

  /**
   * Infer copilot mode from run type
   */
  private inferModeFromRunType(runType: string): CopilotMode {
    if (runType.includes('graphrag')) return 'graphrag';
    if (runType.includes('nl2cypher') || runType.includes('nl_to_cypher')) return 'nl2cypher';
    return 'auto';
  }

  /**
   * Health check for AI Copilot services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      graphrag: boolean;
      nl2cypher: boolean;
      queryPreview: boolean;
      provenance: boolean;
      redaction: boolean;
    };
    timestamp: Date;
  }> {
    const checks = {
      graphrag: false,
      nl2cypher: false,
      queryPreview: false,
      provenance: false,
      redaction: false,
    };

    // Check each service (simplified - in production would do actual health checks)
    try {
      checks.graphrag = !!this.graphRAGService;
      checks.nl2cypher = !!this.nl2CypherService;
      checks.queryPreview = !!this.queryPreviewService;
      checks.provenance = true; // ProvLedgerClient availability
      checks.redaction = true; // RedactionService availability
    } catch (error) {
      logger.error({ error }, 'Health check failed');
    }

    const healthyCount = Object.values(checks).filter(v => v).length;
    const totalCount = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      status = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services: checks,
      timestamp: new Date(),
    };
  }
}
