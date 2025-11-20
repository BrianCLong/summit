/**
 * NL Graph Query Copilot Service
 *
 * Translates natural language questions into safe, previewable Cypher graph queries.
 * Does NOT execute queries - only generates and validates them.
 */

import { randomUUID } from 'crypto';
import pino from 'pino';
import type {
  CompileRequest,
  CompileResponse,
  CompileError,
  SchemaContext,
} from './types';
import { generateFromPattern, queryPatterns } from './query-patterns';
import { estimateQueryCost, isSafeToExecute, generateCostWarnings } from './cost-estimator';
import { validateCypher, extractRequiredParameters, isReadOnlyQuery } from './validator';
import { explainQuery, summarizeQuery } from './explainer';

const logger = pino({ name: 'nl-graph-query' });

export class NlGraphQueryService {
  private readonly queryCache = new Map<string, CompileResponse>();

  /**
   * Compile a natural language prompt into a Cypher query
   */
  async compile(request: CompileRequest): Promise<CompileResponse | CompileError> {
    const startTime = Date.now();
    const queryId = randomUUID();

    logger.info(
      {
        queryId,
        prompt: request.prompt,
        tenantId: request.schemaContext.tenantId,
        userId: request.schemaContext.userId,
      },
      'Compiling NL query',
    );

    try {
      // Validate input
      const inputValidation = this.validateInput(request);
      if (!inputValidation.valid) {
        return this.createError(
          'INVALID_INPUT',
          inputValidation.message!,
          inputValidation.suggestions || [],
          request.prompt,
        );
      }

      // Check cache
      const cacheKey = this.getCacheKey(request);
      if (this.queryCache.has(cacheKey)) {
        logger.info({ queryId, cached: true }, 'Returning cached query');
        return this.queryCache.get(cacheKey)!;
      }

      // Generate Cypher from natural language
      const cypher = await this.generateCypher(request.prompt, request.schemaContext);

      if (!cypher) {
        return this.createError(
          'GENERATION_FAILED',
          'Could not generate Cypher query from prompt',
          [
            'Try rephrasing your question more specifically',
            'Include entity types or relationship names if known',
            'Start with simpler queries like "show all nodes"',
          ],
          request.prompt,
        );
      }

      // Validate the generated Cypher
      const validation = validateCypher(cypher);
      if (!validation.isValid) {
        logger.warn(
          {
            queryId,
            syntaxErrors: validation.syntaxErrors,
            securityIssues: validation.securityIssues,
          },
          'Generated invalid Cypher',
        );

        return this.createError(
          'INVALID_CYPHER',
          'Generated query contains errors',
          [
            ...validation.syntaxErrors,
            ...validation.securityIssues,
            'This is a bug - please report it with your prompt',
          ],
          request.prompt,
        );
      }

      // Estimate query cost
      const estimatedCost = estimateQueryCost(cypher);

      // Generate explanation
      const explanation = request.verbose
        ? explainQuery(cypher, true)
        : summarizeQuery(cypher);

      // Extract required parameters
      const requiredParameters = extractRequiredParameters(cypher);

      // Check safety
      const isSafe = isSafeToExecute(estimatedCost) && isReadOnlyQuery(cypher);

      // Generate warnings
      const warnings = [
        ...validation.warnings,
        ...generateCostWarnings(estimatedCost),
      ];

      if (!isReadOnlyQuery(cypher)) {
        warnings.push('Query contains mutation operations - execution blocked');
      }

      const response: CompileResponse = {
        queryId,
        cypher,
        estimatedCost,
        explanation,
        requiredParameters,
        isSafe,
        warnings,
        timestamp: new Date(),
      };

      // Cache the response
      this.queryCache.set(cacheKey, response);

      const compilationTime = Date.now() - startTime;
      logger.info(
        {
          queryId,
          compilationTimeMs: compilationTime,
          costClass: estimatedCost.costClass,
          isSafe,
          warningCount: warnings.length,
          requiredParams: requiredParameters.length,
        },
        'Query compilation completed',
      );

      return response;
    } catch (error) {
      logger.error(
        {
          queryId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Query compilation failed',
      );

      return this.createError(
        'INTERNAL_ERROR',
        'An unexpected error occurred during compilation',
        [
          'Please try again',
          'If the problem persists, contact support with the query ID',
        ],
        request.prompt,
      );
    }
  }

  /**
   * Generate Cypher from natural language using pattern matching
   */
  private async generateCypher(
    prompt: string,
    context: SchemaContext,
  ): Promise<string | null> {
    const trimmed = prompt.trim();

    // Try pattern matching first
    const patternResult = generateFromPattern(trimmed, context);
    if (patternResult) {
      logger.debug(
        {
          patternName: patternResult.patternName,
          expectedCost: patternResult.expectedCost,
        },
        'Generated Cypher from pattern',
      );
      return patternResult.cypher;
    }

    // If no pattern matches, try to generate a generic query
    // For now, return null - in production, this would call an LLM
    logger.warn({ prompt }, 'No matching pattern found for prompt');
    return null;
  }

  /**
   * Validate input request
   */
  private validateInput(request: CompileRequest): {
    valid: boolean;
    message?: string;
    suggestions?: string[];
  } {
    if (!request.prompt || request.prompt.trim().length === 0) {
      return {
        valid: false,
        message: 'Prompt cannot be empty',
        suggestions: ['Provide a natural language question about the graph'],
      };
    }

    if (request.prompt.length > 1000) {
      return {
        valid: false,
        message: 'Prompt is too long (max 1000 characters)',
        suggestions: ['Break down your question into smaller, specific queries'],
      };
    }

    if (!request.schemaContext) {
      return {
        valid: false,
        message: 'Schema context is required',
        suggestions: ['Provide graph schema information'],
      };
    }

    return { valid: true };
  }

  /**
   * Create a cache key for a request
   */
  private getCacheKey(request: CompileRequest): string {
    const parts = [
      request.prompt.trim().toLowerCase(),
      request.schemaContext.tenantId || 'default',
      request.verbose ? 'verbose' : 'concise',
    ];
    return parts.join('::');
  }

  /**
   * Create a standardized error response
   */
  private createError(
    code: string,
    message: string,
    suggestions: string[],
    originalPrompt: string,
  ): CompileError {
    return {
      code,
      message,
      suggestions,
      originalPrompt,
    };
  }

  /**
   * Get information about available query patterns
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

  /**
   * Clear the query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    logger.info('Query cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.queryCache.size,
      maxSize: 1000, // Could be configurable
    };
  }
}

/**
 * Singleton instance
 */
let serviceInstance: NlGraphQueryService | null = null;

/**
 * Get the singleton service instance
 */
export function getNlGraphQueryService(): NlGraphQueryService {
  if (!serviceInstance) {
    serviceInstance = new NlGraphQueryService();
  }
  return serviceInstance;
}
