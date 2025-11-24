/**
 * Copilot Service
 *
 * Main orchestration service for AI copilot functionality.
 * Integrates:
 * - NL-to-Query translation
 * - GraphRAG with provenance
 * - Sandbox execution
 * - Redaction filtering
 * - Guardrails enforcement
 */

import { randomUUID } from 'crypto';
import pino from 'pino';
import type { Driver } from 'neo4j-driver';

import {
  type NLQueryRequest,
  type GraphRAGRequest,
  type CopilotAnswer,
  type CopilotRefusal,
  type QueryPreview,
  type CopilotResponse,
  isAnswer,
  isRefusal,
  isPreview,
} from './types.js';
import { NLQueryService, createNLQueryService } from './nl-query.service.js';
import {
  SandboxExecutorService,
  createSandboxExecutor,
  type DryRunPlan,
  type ExecutionResult,
} from './sandbox-executor.service.js';
import {
  GraphRAGProvenanceService,
  createGraphRAGProvenanceService,
} from './graphrag-provenance.service.js';
import {
  RedactionService,
  createRedactionService,
  createRedactionServiceForUser,
  type ClassificationLevel,
} from './redaction.service.js';
import {
  GuardrailsService,
  createGuardrailsService,
} from './guardrails.service.js';

const logger = pino({ name: 'copilot-service' });

/**
 * LLM service interface
 */
interface LLMService {
  complete(params: {
    prompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: 'json';
  }): Promise<string>;
}

/**
 * Copilot service configuration
 */
export interface CopilotConfig {
  /** Neo4j driver */
  neo4jDriver: Driver;
  /** LLM service */
  llmService: LLMService;
  /** Prov-ledger URL */
  provLedgerUrl?: string;
  /** Default user clearance */
  defaultClearance?: ClassificationLevel;
  /** Enable query execution (vs preview only) */
  enableExecution?: boolean;
}

/**
 * Request context
 */
export interface RequestContext {
  userId?: string;
  tenantId?: string;
  clearance?: ClassificationLevel;
  investigationId: string;
}

/**
 * Main Copilot Service
 */
export class CopilotService {
  private readonly nlQueryService: NLQueryService;
  private readonly sandboxExecutor: SandboxExecutorService;
  private readonly graphRAGService: GraphRAGProvenanceService;
  private readonly redactionService: RedactionService;
  private readonly guardrailsService: GuardrailsService;
  private readonly config: CopilotConfig;

  constructor(config: CopilotConfig) {
    this.config = config;

    // Initialize services
    this.nlQueryService = createNLQueryService();
    this.sandboxExecutor = createSandboxExecutor(config.neo4jDriver);
    this.graphRAGService = createGraphRAGProvenanceService(
      config.neo4jDriver,
      config.llmService,
      config.provLedgerUrl,
    );
    this.redactionService = createRedactionService({
      userClearance: config.defaultClearance || 'UNCLASSIFIED',
    });
    this.guardrailsService = createGuardrailsService();

    logger.info('Copilot service initialized');
  }

  /**
   * Process a natural language query
   *
   * Flow:
   * 1. Validate prompt with guardrails
   * 2. Compile NL to Cypher query
   * 3. If dry-run: return preview
   * 4. If execution allowed: run in sandbox
   * 5. Generate answer with GraphRAG
   * 6. Apply redaction
   * 7. Final guardrail validation
   */
  async processQuery(
    request: NLQueryRequest,
    context: RequestContext,
  ): Promise<CopilotResponse> {
    const requestId = randomUUID();
    const startTime = Date.now();

    logger.info(
      {
        requestId,
        investigationId: request.investigationId,
        queryLength: request.query.length,
        dryRun: request.dryRun,
      },
      'Processing copilot query',
    );

    try {
      // Step 1: Validate prompt with guardrails
      const promptValidation = this.guardrailsService.validatePrompt(
        request.query,
        context.userId,
        context.tenantId,
      );

      if (!promptValidation.allowed) {
        logger.warn(
          { requestId, riskLevel: promptValidation.riskLevel },
          'Prompt blocked by guardrails',
        );

        return {
          type: 'refusal',
          data: this.guardrailsService.createPolicyRefusal(
            promptValidation.reason || 'Prompt validation failed',
          ),
        };
      }

      // Step 2: Compile NL to Cypher
      const preview = await this.nlQueryService.compileQuery({
        ...request,
        userId: context.userId,
        tenantId: context.tenantId,
      });

      // If compilation failed or query not allowed
      if (!preview.allowed || !preview.cypher) {
        logger.info(
          { requestId, blockReason: preview.blockReason },
          'Query compilation blocked',
        );

        return {
          type: 'preview',
          data: preview,
        };
      }

      // Step 3: If dry-run, return preview
      if (request.dryRun) {
        // Add dry-run plan information
        const dryRunPlan = await this.sandboxExecutor.dryRunPlan(preview);

        return {
          type: 'preview',
          data: {
            ...preview,
            // Merge dry-run information
            refinements: dryRunPlan.withinBudget
              ? preview.refinements
              : dryRunPlan.refinements,
            warnings: [
              ...preview.warnings,
              ...dryRunPlan.budgetViolations,
            ],
            allowed: dryRunPlan.recommendExecution,
            blockReason: dryRunPlan.recommendExecution
              ? undefined
              : dryRunPlan.recommendationReason,
          },
        };
      }

      // Step 4: Execute in sandbox (if enabled)
      if (!this.config.enableExecution) {
        return {
          type: 'preview',
          data: {
            ...preview,
            warnings: [
              ...preview.warnings,
              'Query execution is disabled. Only preview is available.',
            ],
          },
        };
      }

      // Step 5: Generate answer with GraphRAG
      const answer = await this.generateAnswer(request, context, preview);

      // Step 6: Apply redaction based on user clearance
      const redactionService =
        context.clearance
          ? createRedactionServiceForUser(context.clearance)
          : this.redactionService;

      const redactedResult = redactionService.redactAnswer(answer);

      // Step 7: Final guardrail validation
      const validation = this.guardrailsService.validateAnswer(
        redactedResult.content,
        request.query,
      );

      if (!validation.valid || validation.refusal) {
        logger.warn(
          {
            requestId,
            failureReason: validation.checks.failureReason,
          },
          'Answer failed guardrail validation',
        );

        if (validation.refusal) {
          return {
            type: 'refusal',
            data: validation.refusal,
          };
        }
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        {
          requestId,
          executionTimeMs: executionTime,
          citationCount: redactedResult.content.citations.length,
          confidence: redactedResult.content.confidence,
          wasRedacted: redactedResult.wasRedacted,
        },
        'Copilot query completed',
      );

      return {
        type: 'answer',
        data: {
          ...redactedResult.content,
          executedQuery: preview.cypher,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(
        {
          requestId,
          executionTimeMs: executionTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Copilot query failed',
      );

      return {
        type: 'refusal',
        data: {
          refusalId: randomUUID(),
          reason:
            error instanceof Error
              ? `Processing error: ${error.message}`
              : 'An unexpected error occurred',
          category: 'internal_error',
          suggestions: [
            'Try simplifying your question',
            'Check if the investigation has the data you need',
            'Contact support if the problem persists',
          ],
          timestamp: new Date().toISOString(),
          auditId: randomUUID(),
        },
      };
    }
  }

  /**
   * Answer a question using GraphRAG
   */
  async answerQuestion(
    request: GraphRAGRequest,
    context: RequestContext,
  ): Promise<CopilotResponse> {
    const requestId = randomUUID();
    const startTime = Date.now();

    logger.info(
      {
        requestId,
        investigationId: request.investigationId,
        questionLength: request.question.length,
      },
      'Processing GraphRAG question',
    );

    try {
      // Validate prompt
      const promptValidation = this.guardrailsService.validatePrompt(
        request.question,
        context.userId,
        context.tenantId,
      );

      if (!promptValidation.allowed) {
        return {
          type: 'refusal',
          data: this.guardrailsService.createPolicyRefusal(
            promptValidation.reason || 'Question validation failed',
          ),
        };
      }

      // Generate answer with GraphRAG
      const answer = await this.graphRAGService.answer({
        ...request,
        userId: context.userId,
        tenantId: context.tenantId,
      });

      // Apply redaction
      const redactionService =
        context.clearance
          ? createRedactionServiceForUser(context.clearance)
          : this.redactionService;

      const redactedResult = redactionService.redactAnswer(answer);

      // Validate with guardrails
      const validation = this.guardrailsService.validateAnswer(
        redactedResult.content,
        request.question,
      );

      if (validation.refusal) {
        return {
          type: 'refusal',
          data: validation.refusal,
        };
      }

      const executionTime = Date.now() - startTime;
      logger.info(
        {
          requestId,
          executionTimeMs: executionTime,
          citationCount: redactedResult.content.citations.length,
          confidence: redactedResult.content.confidence,
        },
        'GraphRAG question answered',
      );

      return {
        type: 'answer',
        data: redactedResult.content,
      };
    } catch (error) {
      logger.error(
        {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'GraphRAG question failed',
      );

      return {
        type: 'refusal',
        data: {
          refusalId: randomUUID(),
          reason:
            error instanceof Error
              ? error.message
              : 'Failed to answer question',
          category: 'internal_error',
          suggestions: ['Try a simpler question', 'Check your access permissions'],
          timestamp: new Date().toISOString(),
          auditId: randomUUID(),
        },
      };
    }
  }

  /**
   * Preview a query without execution
   */
  async previewQuery(
    request: NLQueryRequest,
    context: RequestContext,
  ): Promise<QueryPreview> {
    // Force dry-run mode
    const preview = await this.nlQueryService.compileQuery({
      ...request,
      dryRun: true,
      userId: context.userId,
      tenantId: context.tenantId,
    });

    // Add dry-run plan if query is valid
    if (preview.cypher && preview.allowed) {
      const dryRunPlan = await this.sandboxExecutor.dryRunPlan(preview);

      return {
        ...preview,
        refinements: dryRunPlan.withinBudget
          ? preview.refinements
          : dryRunPlan.refinements,
        warnings: [...preview.warnings, ...dryRunPlan.budgetViolations],
        allowed: dryRunPlan.recommendExecution,
        blockReason: dryRunPlan.recommendExecution
          ? undefined
          : dryRunPlan.recommendationReason,
      };
    }

    return preview;
  }

  /**
   * Execute a previewed query
   */
  async executeQuery(
    preview: QueryPreview,
    context: RequestContext,
  ): Promise<ExecutionResult> {
    if (!this.config.enableExecution) {
      return {
        executionId: randomUUID(),
        cypher: preview.cypher,
        success: false,
        rows: [],
        rowCount: 0,
        truncated: false,
        executionTimeMs: 0,
        error: 'Query execution is disabled',
        warnings: [],
      };
    }

    return this.sandboxExecutor.execute(preview, {
      investigationId: context.investigationId,
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }

  /**
   * Generate answer from query execution
   */
  private async generateAnswer(
    request: NLQueryRequest,
    context: RequestContext,
    preview: QueryPreview,
  ): Promise<CopilotAnswer> {
    // Use GraphRAG to generate answer
    const graphRAGRequest: GraphRAGRequest = {
      question: request.query,
      investigationId: request.investigationId,
      userId: context.userId,
      tenantId: context.tenantId,
      focusEntityIds: request.focusEntityIds,
      maxHops: request.maxHops,
      temperature: request.temperature,
      includeEvidence: true,
      includeClaims: true,
    };

    return this.graphRAGService.answer(graphRAGRequest);
  }

  /**
   * Get available query patterns
   */
  getAvailablePatterns() {
    return this.nlQueryService.getAvailablePatterns();
  }

  /**
   * Get guardrail statistics
   */
  getGuardrailStats() {
    return this.guardrailsService.getStats();
  }

  /**
   * Get risky prompts for review
   */
  getRiskyPromptsForReview() {
    return this.guardrailsService.getRiskyPromptsForReview();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
  }> {
    const sandboxHealth = await this.sandboxExecutor.healthCheck();
    const graphRAGHealth = await this.graphRAGService.healthCheck();

    return {
      healthy: sandboxHealth.healthy && graphRAGHealth.healthy,
      services: {
        nlQuery: true,
        sandbox: sandboxHealth.healthy,
        graphRAG: graphRAGHealth.healthy,
        neo4j: sandboxHealth.neo4jConnected,
        provLedger: graphRAGHealth.provLedger,
        redaction: true,
        guardrails: true,
      },
    };
  }
}

/**
 * Create a copilot service instance
 */
export function createCopilotService(config: CopilotConfig): CopilotService {
  return new CopilotService(config);
}

/**
 * Singleton instance
 */
let serviceInstance: CopilotService | null = null;

/**
 * Initialize the singleton copilot service
 */
export function initializeCopilotService(config: CopilotConfig): CopilotService {
  serviceInstance = new CopilotService(config);
  return serviceInstance;
}

/**
 * Get the singleton copilot service
 */
export function getCopilotService(): CopilotService {
  if (!serviceInstance) {
    throw new Error('Copilot service not initialized. Call initializeCopilotService first.');
  }
  return serviceInstance;
}
