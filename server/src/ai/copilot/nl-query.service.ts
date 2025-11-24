/**
 * Enhanced NL-to-Query Service
 *
 * Converts natural language questions into safe, previewable graph queries.
 * Features:
 * - Pattern-based matching for common queries
 * - LLM fallback for complex queries
 * - Query cost estimation and refinement suggestions
 * - Sandbox execution path with dry-run planner
 */

import { randomUUID } from 'crypto';
import pino from 'pino';
import { z } from 'zod';

import {
  NLQueryRequestSchema,
  QueryPreviewSchema,
  QueryRefinementSchema,
  type NLQueryRequest,
  type QueryPreview,
  type QueryRefinement,
  type QueryCostEstimate,
} from './types.js';
import {
  generateFromPattern,
  queryPatterns,
} from '../nl-graph-query/query-patterns.js';
import {
  estimateQueryCost,
  isSafeToExecute,
  generateCostWarnings,
} from '../nl-graph-query/cost-estimator.js';
import {
  validateCypher,
  extractRequiredParameters,
  isReadOnlyQuery,
} from '../nl-graph-query/validator.js';
import { explainQuery, summarizeQuery } from '../nl-graph-query/explainer.js';
import type { SchemaContext } from '../nl-graph-query/types.js';

const logger = pino({ name: 'nl-query-service' });

// Configuration from environment
const LLM_ENABLED = process.env.COPILOT_LLM_ENABLED !== 'false';
const MAX_COST_CLASS = process.env.COPILOT_MAX_COST_CLASS || 'high';
const MAX_ESTIMATED_TIME_MS = parseInt(
  process.env.COPILOT_MAX_ESTIMATED_TIME_MS || '10000',
  10,
);

/**
 * LLM adapter interface for query generation
 */
interface LLMAdapter {
  generateCypher(params: {
    prompt: string;
    schemaContext: SchemaContext;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    cypher: string;
    explanation: string;
  }>;
}

/**
 * Schema context fetcher interface
 */
interface SchemaContextFetcher {
  getSchemaContext(investigationId: string): Promise<SchemaContext>;
}

/**
 * Prompt templates for LLM-based query generation
 */
const CYPHER_GENERATION_PROMPT = `You are an expert Neo4j Cypher query generator for an intelligence analysis platform.

SCHEMA CONTEXT:
{{SCHEMA}}

USER QUESTION: {{QUESTION}}

RULES:
1. Generate ONLY read-only Cypher queries (MATCH, RETURN, WITH, WHERE, ORDER BY, LIMIT)
2. NEVER generate CREATE, MERGE, SET, DELETE, or REMOVE statements
3. Always include a LIMIT clause (max 500)
4. Use parameterized queries with $paramName syntax for user inputs
5. Include WHERE clauses to filter by investigationId when applicable
6. For path queries, limit depth to max 8 hops
7. Add tenant filtering if tenantId is in context

Generate a valid Cypher query and provide a brief explanation of what it does.

Response format (JSON):
{
  "cypher": "YOUR_CYPHER_QUERY_HERE",
  "explanation": "Brief explanation of what this query does"
}`;

/**
 * Enhanced NL-to-Query Service
 */
export class NLQueryService {
  private readonly queryCache = new Map<string, QueryPreview>();
  private readonly llmAdapter?: LLMAdapter;
  private readonly schemaFetcher?: SchemaContextFetcher;

  constructor(options?: {
    llmAdapter?: LLMAdapter;
    schemaFetcher?: SchemaContextFetcher;
  }) {
    this.llmAdapter = options?.llmAdapter;
    this.schemaFetcher = options?.schemaFetcher;
  }

  /**
   * Compile a natural language query into a Cypher query preview
   */
  async compileQuery(request: NLQueryRequest): Promise<QueryPreview> {
    const validated = NLQueryRequestSchema.parse(request);
    const queryId = randomUUID();
    const startTime = Date.now();

    logger.info(
      {
        queryId,
        query: validated.query.substring(0, 100),
        investigationId: validated.investigationId,
        userId: validated.userId,
      },
      'Compiling NL query',
    );

    try {
      // Get schema context
      const schemaContext = await this.getSchemaContext(
        validated.investigationId,
        validated.tenantId,
        validated.userId,
      );

      // Try pattern matching first
      let cypher: string | null = null;
      let explanation: string = '';
      let usedLLM = false;

      const patternResult = generateFromPattern(
        validated.query,
        schemaContext,
      );

      if (patternResult) {
        cypher = patternResult.cypher;
        explanation = summarizeQuery(cypher);
        logger.debug(
          { queryId, pattern: patternResult.patternName },
          'Generated from pattern',
        );
      } else if (LLM_ENABLED && this.llmAdapter) {
        // Fallback to LLM
        const llmResult = await this.generateWithLLM(
          validated.query,
          schemaContext,
          validated.temperature,
        );
        if (llmResult) {
          cypher = llmResult.cypher;
          explanation = llmResult.explanation;
          usedLLM = true;
          logger.debug({ queryId, usedLLM }, 'Generated with LLM fallback');
        }
      }

      if (!cypher) {
        // Could not generate query
        return this.createFailedPreview(
          queryId,
          validated.query,
          'Could not generate Cypher query from prompt',
          this.getSuggestions(validated.query),
        );
      }

      // Validate the generated Cypher
      const validation = validateCypher(cypher);
      if (!validation.isValid) {
        logger.warn(
          { queryId, syntaxErrors: validation.syntaxErrors },
          'Generated invalid Cypher',
        );
        return this.createFailedPreview(
          queryId,
          validated.query,
          'Generated query contains errors',
          validation.syntaxErrors,
        );
      }

      // Estimate cost
      const cost = estimateQueryCost(cypher);

      // Check if query is safe to execute
      const isSafe =
        isSafeToExecute(cost) &&
        isReadOnlyQuery(cypher) &&
        this.isWithinBudget(cost);

      // Generate refinement suggestions if over budget
      const refinements = isSafe
        ? []
        : this.generateRefinements(validated.query, cypher, cost);

      // Extract parameters
      const requiredParams = extractRequiredParameters(cypher);
      const parameters: Record<string, any> = {};

      // Bind known parameters
      for (const param of requiredParams) {
        if (param === 'investigationId') {
          parameters[param] = validated.investigationId;
        } else if (param === 'tenantId' && validated.tenantId) {
          parameters[param] = validated.tenantId;
        } else if (param === 'userId' && validated.userId) {
          parameters[param] = validated.userId;
        }
        // Other parameters need to be provided by the user
      }

      // Generate warnings
      const warnings = [
        ...validation.warnings,
        ...generateCostWarnings(cost),
      ];

      if (usedLLM) {
        warnings.push(
          'Query was generated using AI - review carefully before execution',
        );
      }

      if (!isReadOnlyQuery(cypher)) {
        warnings.push('Query contains mutation operations - execution blocked');
      }

      const preview: QueryPreview = {
        queryId,
        cypher,
        explanation,
        cost,
        isSafe,
        parameters,
        warnings,
        refinements: refinements.length > 0 ? refinements : undefined,
        allowed: isSafe,
        blockReason: isSafe
          ? undefined
          : this.getBlockReason(cost, isReadOnlyQuery(cypher)),
      };

      // Cache the preview
      this.cachePreview(validated, preview);

      const compilationTime = Date.now() - startTime;
      logger.info(
        {
          queryId,
          compilationTimeMs: compilationTime,
          costClass: cost.costClass,
          isSafe,
          usedLLM,
        },
        'Query compilation completed',
      );

      return preview;
    } catch (error) {
      logger.error(
        {
          queryId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Query compilation failed',
      );

      return this.createFailedPreview(
        queryId,
        validated.query,
        'An error occurred during compilation',
        ['Please try again', 'Simplify your question'],
      );
    }
  }

  /**
   * Generate Cypher using LLM adapter
   */
  private async generateWithLLM(
    prompt: string,
    schemaContext: SchemaContext,
    temperature?: number,
  ): Promise<{ cypher: string; explanation: string } | null> {
    if (!this.llmAdapter) {
      return null;
    }

    try {
      const result = await this.llmAdapter.generateCypher({
        prompt,
        schemaContext,
        maxTokens: 500,
        temperature: temperature ?? 0,
      });

      // Validate the LLM output
      if (!result.cypher || result.cypher.trim().length === 0) {
        return null;
      }

      return result;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'LLM generation failed',
      );
      return null;
    }
  }

  /**
   * Get schema context for an investigation
   */
  private async getSchemaContext(
    investigationId: string,
    tenantId?: string,
    userId?: string,
  ): Promise<SchemaContext> {
    if (this.schemaFetcher) {
      const context = await this.schemaFetcher.getSchemaContext(
        investigationId,
      );
      return {
        ...context,
        tenantId,
        userId,
        investigationId,
      };
    }

    // Default schema context
    return {
      nodeLabels: [
        'Entity',
        'Person',
        'Organization',
        'Location',
        'Event',
        'Document',
      ],
      relationshipTypes: [
        'RELATED_TO',
        'CONNECTED_TO',
        'COMMUNICATES_WITH',
        'MEMBER_OF',
        'LOCATED_AT',
        'PARTICIPATED_IN',
      ],
      tenantId,
      userId,
      investigationId,
    };
  }

  /**
   * Check if query is within configured budget
   */
  private isWithinBudget(cost: QueryCostEstimate): boolean {
    const costClassOrder = ['low', 'medium', 'high', 'very-high'];
    const maxClassIndex = costClassOrder.indexOf(MAX_COST_CLASS);
    const currentClassIndex = costClassOrder.indexOf(cost.costClass);

    if (currentClassIndex > maxClassIndex) {
      return false;
    }

    if (cost.estimatedTimeMs > MAX_ESTIMATED_TIME_MS) {
      return false;
    }

    return true;
  }

  /**
   * Generate refinement suggestions for over-budget queries
   */
  private generateRefinements(
    originalPrompt: string,
    cypher: string,
    cost: QueryCostEstimate,
  ): QueryRefinement[] {
    const refinements: QueryRefinement[] = [];

    // Suggest adding LIMIT if missing
    if (!cypher.toUpperCase().includes('LIMIT')) {
      refinements.push({
        original: originalPrompt,
        suggested: `${originalPrompt} (limit to first 25 results)`,
        reason: 'Adding a limit reduces the result set size',
        estimatedCostReduction: 'medium',
      });
    }

    // Suggest narrowing scope for path queries
    if (cypher.includes('[*')) {
      refinements.push({
        original: originalPrompt,
        suggested: `${originalPrompt} (within 2 hops)`,
        reason:
          'Reducing path depth significantly decreases computational cost',
        estimatedCostReduction: 'high',
      });
    }

    // Suggest adding filters
    if (!cypher.toUpperCase().includes('WHERE')) {
      refinements.push({
        original: originalPrompt,
        suggested: `${originalPrompt} for a specific entity type`,
        reason: 'Filtering by entity type reduces the search space',
        estimatedCostReduction: 'medium',
      });
    }

    // Suggest time bounds for large graphs
    if (cost.nodesScanned > 10000) {
      refinements.push({
        original: originalPrompt,
        suggested: `${originalPrompt} in the last 30 days`,
        reason: 'Time-bounding the query reduces the data scanned',
        estimatedCostReduction: 'high',
      });
    }

    return refinements;
  }

  /**
   * Get suggestions for failed query generation
   */
  private getSuggestions(prompt: string): string[] {
    const suggestions: string[] = [
      'Try rephrasing your question more specifically',
      'Include entity types or relationship names if known',
    ];

    // Suggest available patterns
    const availablePatterns = queryPatterns
      .slice(0, 3)
      .map((p) => p.description);
    suggestions.push(...availablePatterns.map((d) => `Try: "${d}"`));

    return suggestions;
  }

  /**
   * Get block reason for unsafe queries
   */
  private getBlockReason(cost: QueryCostEstimate, isReadOnly: boolean): string {
    if (!isReadOnly) {
      return 'Query contains mutation operations which are not allowed';
    }

    if (cost.costClass === 'very-high') {
      return `Query cost is too high (${cost.costClass}). Consider adding filters or limits.`;
    }

    if (cost.estimatedTimeMs > MAX_ESTIMATED_TIME_MS) {
      return `Estimated execution time (${cost.estimatedTimeMs}ms) exceeds limit (${MAX_ESTIMATED_TIME_MS}ms)`;
    }

    return 'Query does not meet safety requirements';
  }

  /**
   * Create a failed preview response
   */
  private createFailedPreview(
    queryId: string,
    originalQuery: string,
    reason: string,
    suggestions: string[],
  ): QueryPreview {
    return {
      queryId,
      cypher: '',
      explanation: reason,
      cost: {
        nodesScanned: 0,
        edgesScanned: 0,
        costClass: 'low',
        estimatedTimeMs: 0,
        estimatedMemoryMb: 0,
        costDrivers: [],
      },
      isSafe: false,
      parameters: {},
      warnings: suggestions,
      allowed: false,
      blockReason: reason,
    };
  }

  /**
   * Cache a query preview
   */
  private cachePreview(request: NLQueryRequest, preview: QueryPreview): void {
    const cacheKey = this.getCacheKey(request);
    this.queryCache.set(cacheKey, preview);

    // Limit cache size
    if (this.queryCache.size > 1000) {
      const firstKey = this.queryCache.keys().next().value;
      if (firstKey) {
        this.queryCache.delete(firstKey);
      }
    }
  }

  /**
   * Generate cache key for a request
   */
  private getCacheKey(request: NLQueryRequest): string {
    return [
      request.query.trim().toLowerCase(),
      request.investigationId,
      request.tenantId || 'default',
    ].join('::');
  }

  /**
   * Get cached preview if available
   */
  getCachedPreview(request: NLQueryRequest): QueryPreview | null {
    const cacheKey = this.getCacheKey(request);
    return this.queryCache.get(cacheKey) || null;
  }

  /**
   * Clear the query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    logger.info('Query cache cleared');
  }

  /**
   * Get available query patterns
   */
  getAvailablePatterns(): Array<{
    name: string;
    description: string;
    expectedCost: string;
  }> {
    return queryPatterns.map((p) => ({
      name: p.name,
      description: p.description,
      expectedCost: p.expectedCost,
    }));
  }
}

/**
 * Singleton instance
 */
let serviceInstance: NLQueryService | null = null;

/**
 * Get the singleton service instance
 */
export function getNLQueryService(): NLQueryService {
  if (!serviceInstance) {
    serviceInstance = new NLQueryService();
  }
  return serviceInstance;
}

/**
 * Create a new service instance with custom adapters
 */
export function createNLQueryService(options: {
  llmAdapter?: LLMAdapter;
  schemaFetcher?: SchemaContextFetcher;
}): NLQueryService {
  return new NLQueryService(options);
}
