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
} from './types.js';
import { generateFromPattern, queryPatterns, findMatchingPattern } from './query-patterns.js';
import { estimateQueryCost, isSafeToExecute, generateCostWarnings } from './cost-estimator.js';
import { validateCypher, extractRequiredParameters, isReadOnlyQuery } from './validator.js';
import { explainQuery, summarizeQuery } from './explainer.js';
import {
  recordCompilationSuccess,
  recordCompilationError,
  recordCacheHit,
  recordCacheMiss,
  updateCacheSize,
  recordSafetyBlock,
  recordWarning,
} from './metrics.js';

const logger = pino({ name: 'nl-graph-query' });

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;
const CACHE_CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

interface CachedResponse {
  response: CompileResponse;
  expiresAt: number;
  pattern: string;
}

export class NlGraphQueryService {
  private readonly queryCache = new Map<string, CachedResponse>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  constructor() {
    this.startCacheCleanup();
    this.initialized = true;
    logger.info('NL Graph Query Service initialized');
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, CACHE_CLEANUP_INTERVAL_MS);

    // Don't let this interval keep the process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.queryCache.entries()) {
      if (entry.expiresAt < now) {
        this.queryCache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug({ expiredCount, cacheSize: this.queryCache.size }, 'Cache cleanup completed');
    }

    updateCacheSize(this.queryCache.size);
  }

  /**
   * Compile a natural language prompt into a Cypher query
   */
  async compile(request: CompileRequest): Promise<CompileResponse | CompileError> {
    const startTime = Date.now();
    const queryId = randomUUID();

    logger.info(
      {
        queryId,
        prompt: request.prompt.substring(0, 100), // Truncate for logging
        tenantId: request.schemaContext?.tenantId,
        userId: request.schemaContext?.userId,
      },
      'Compiling NL query',
    );

    try {
      // Validate input
      const inputValidation = this.validateInput(request);
      if (!inputValidation.valid) {
        const latencyMs = Date.now() - startTime;
        recordCompilationError('INVALID_INPUT', latencyMs);
        return this.createError(
          'INVALID_INPUT',
          inputValidation.message!,
          inputValidation.suggestions || [],
          request.prompt,
        );
      }

      // Check cache
      const cacheKey = this.getCacheKey(request);
      const cachedEntry = this.queryCache.get(cacheKey);

      if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
        const latencyMs = Date.now() - startTime;
        recordCacheHit();
        recordCompilationSuccess(
          cachedEntry.pattern,
          cachedEntry.response.estimatedCost.costClass,
          latencyMs,
          true,
          cachedEntry.response.estimatedCost.nodesScanned,
          cachedEntry.response.estimatedCost.edgesScanned,
        );

        logger.info({ queryId, cached: true, latencyMs }, 'Returning cached query');
        return cachedEntry.response;
      }

      recordCacheMiss();

      // Generate Cypher from natural language
      const generateResult = await this.generateCypher(request.prompt, request.schemaContext);

      if (!generateResult) {
        const latencyMs = Date.now() - startTime;
        recordCompilationError('GENERATION_FAILED', latencyMs);
        return this.createError(
          'GENERATION_FAILED',
          'Could not generate Cypher query from prompt',
          this.getSuggestions(request.prompt),
          request.prompt,
        );
      }

      const { cypher, patternName } = generateResult;

      // Validate the generated Cypher
      const validation = validateCypher(cypher);
      if (!validation.isValid) {
        const latencyMs = Date.now() - startTime;
        recordCompilationError('INVALID_CYPHER', latencyMs);

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

      if (!isSafe) {
        if (!isReadOnlyQuery(cypher)) {
          recordSafetyBlock('mutation_detected');
        } else {
          recordSafetyBlock('high_cost');
        }
      }

      // Generate warnings
      const warnings = [
        ...validation.warnings,
        ...generateCostWarnings(estimatedCost),
      ];

      if (!isReadOnlyQuery(cypher)) {
        warnings.push('Query contains mutation operations - execution blocked');
      }

      // Record warning metrics
      warnings.forEach((warning) => {
        const warningType = this.categorizeWarning(warning);
        recordWarning(warningType);
      });

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

      // Cache the response with TTL
      this.cacheResponse(cacheKey, response, patternName);

      const compilationTime = Date.now() - startTime;

      // Record metrics
      recordCompilationSuccess(
        patternName,
        estimatedCost.costClass,
        compilationTime,
        false,
        estimatedCost.nodesScanned,
        estimatedCost.edgesScanned,
      );

      logger.info(
        {
          queryId,
          compilationTimeMs: compilationTime,
          costClass: estimatedCost.costClass,
          pattern: patternName,
          isSafe,
          warningCount: warnings.length,
          requiredParams: requiredParameters.length,
        },
        'Query compilation completed',
      );

      return response;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      recordCompilationError('INTERNAL_ERROR', latencyMs);

      logger.error(
        {
          queryId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          latencyMs,
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
  ): Promise<{ cypher: string; patternName: string } | null> {
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
      return { cypher: patternResult.cypher, patternName: patternResult.patternName };
    }

    // Try fuzzy matching for common variations
    const fuzzyResult = this.tryFuzzyMatch(trimmed, context);
    if (fuzzyResult) {
      return fuzzyResult;
    }

    // TODO: Add LLM fallback for unrecognized patterns
    logger.warn({ prompt: trimmed.substring(0, 50) }, 'No matching pattern found for prompt');
    return null;
  }

  /**
   * Try fuzzy matching for common prompt variations
   */
  private tryFuzzyMatch(
    prompt: string,
    context: SchemaContext,
  ): { cypher: string; patternName: string } | null {
    const normalized = prompt.toLowerCase().trim();

    // Common variations mapping
    const variations: Record<string, string> = {
      'list nodes': 'show all nodes',
      'get nodes': 'show all nodes',
      'display nodes': 'show all nodes',
      'list all': 'show all nodes',
      'show everything': 'show all nodes',
      'count all': 'count nodes',
      'how many nodes': 'count nodes',
      'total nodes': 'count nodes',
      'find connections': 'show relationships',
      'show edges': 'show relationships',
      'list relations': 'show relationships',
      'who is connected': 'show neighbors',
      'what is connected': 'show neighbors',
      'graph at time': 'show graph state at',
      'snapshot at': 'show graph state at',
      'state at': 'show graph state at',
      'path between': 'shortest path from',
      'route from': 'shortest path from',
      'connect from': 'find paths from',
    };

    for (const [variation, canonical] of Object.entries(variations)) {
      if (normalized.includes(variation)) {
        const mappedPrompt = normalized.replace(variation, canonical);
        const result = generateFromPattern(mappedPrompt, context);
        if (result) {
          return { cypher: result.cypher, patternName: `${result.patternName}:fuzzy` };
        }
      }
    }

    return null;
  }

  /**
   * Get suggestions based on prompt analysis
   */
  private getSuggestions(prompt: string): string[] {
    const suggestions: string[] = [
      'Try rephrasing your question more specifically',
    ];

    const normalized = prompt.toLowerCase();

    // Suggest based on detected intent
    if (normalized.includes('person') || normalized.includes('people')) {
      suggestions.push('Try: "show all Person nodes" or "find neighbors of [entityId]"');
    }
    if (normalized.includes('connection') || normalized.includes('link')) {
      suggestions.push('Try: "show relationships" or "find paths from A to B"');
    }
    if (normalized.includes('time') || normalized.includes('when') || normalized.includes('history')) {
      suggestions.push('Try: "show graph state at 2024-01-15" or "show changes between X and Y"');
    }
    if (normalized.includes('path') || normalized.includes('route')) {
      suggestions.push('Try: "shortest path from nodeA to nodeB"');
    }

    // Add available patterns hint
    const availablePatterns = queryPatterns.slice(0, 5).map((p) => p.name).join(', ');
    suggestions.push(`Available patterns include: ${availablePatterns}...`);

    return suggestions;
  }

  /**
   * Categorize warning for metrics
   */
  private categorizeWarning(warning: string): string {
    const lowerWarning = warning.toLowerCase();

    if (lowerWarning.includes('limit')) return 'no_limit';
    if (lowerWarning.includes('cost')) return 'high_cost';
    if (lowerWarning.includes('memory')) return 'high_memory';
    if (lowerWarning.includes('time')) return 'long_execution';
    if (lowerWarning.includes('mutation')) return 'mutation';
    if (lowerWarning.includes('path')) return 'variable_path';
    if (lowerWarning.includes('cartesian')) return 'cartesian_product';

    return 'other';
  }

  /**
   * Cache a response with TTL
   */
  private cacheResponse(key: string, response: CompileResponse, pattern: string): void {
    // Enforce max cache size using LRU-like eviction
    if (this.queryCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entries (first 10%)
      const keysToRemove = Array.from(this.queryCache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE * 0.1));
      keysToRemove.forEach((k) => this.queryCache.delete(k));
      logger.debug({ removed: keysToRemove.length }, 'Cache eviction performed');
    }

    this.queryCache.set(key, {
      response,
      expiresAt: Date.now() + CACHE_TTL_MS,
      pattern,
    });

    updateCacheSize(this.queryCache.size);
  }

  /**
   * Validate input request
   */
  private validateInput(request: CompileRequest): {
    valid: boolean;
    message?: string;
    suggestions?: string[];
  } {
    if (!request) {
      return {
        valid: false,
        message: 'Request is required',
        suggestions: ['Provide a valid compilation request'],
      };
    }

    if (!request.prompt || typeof request.prompt !== 'string') {
      return {
        valid: false,
        message: 'Prompt must be a non-empty string',
        suggestions: ['Provide a natural language question about the graph'],
      };
    }

    const trimmedPrompt = request.prompt.trim();

    if (trimmedPrompt.length === 0) {
      return {
        valid: false,
        message: 'Prompt cannot be empty',
        suggestions: ['Provide a natural language question about the graph'],
      };
    }

    if (trimmedPrompt.length > 1000) {
      return {
        valid: false,
        message: 'Prompt is too long (max 1000 characters)',
        suggestions: ['Break down your question into smaller, specific queries'],
      };
    }

    if (!request.schemaContext || typeof request.schemaContext !== 'object') {
      return {
        valid: false,
        message: 'Schema context is required and must be an object',
        suggestions: ['Provide graph schema information'],
      };
    }

    // Check for potential injection attempts
    const suspiciousPatterns = [
      /[;\x00]/,      // SQL/Cypher termination
      /\$\{/,         // Template injection
      /\{\{/,         // Template syntax
      /<script/i,     // XSS attempt
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(trimmedPrompt)) {
        return {
          valid: false,
          message: 'Prompt contains invalid characters',
          suggestions: ['Remove special characters and try again'],
        };
      }
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
      request.schemaContext.investigationId || 'none',
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
    example?: string;
  }> {
    return queryPatterns.map((p) => ({
      name: p.name,
      description: p.description,
      expectedCost: p.expectedCost,
      example: this.getPatternExample(p.name),
    }));
  }

  /**
   * Get example prompt for a pattern
   */
  private getPatternExample(patternName: string): string | undefined {
    const examples: Record<string, string> = {
      'list-all-nodes': 'show all nodes',
      'count-nodes': 'count nodes',
      'find-relationships': 'show all relationships',
      'time-travel-snapshot': 'show graph state at 2024-01-15',
      'time-travel-changes': 'show changes between 2024-01-01 and 2024-01-31',
      'shortest-path': 'shortest path from nodeA to nodeB',
      'coa-path-analysis': 'find paths from entityA to entityB',
      'neighbors': 'show neighbors of node123',
      'timeline-events': 'show timeline of events',
      'geo-temporal-entities': 'show entities near NYC at 2024-01-15',
    };

    return examples[patternName];
  }

  /**
   * Clear the query cache
   */
  clearCache(): void {
    const previousSize = this.queryCache.size;
    this.queryCache.clear();
    updateCacheSize(0);
    logger.info({ previousSize }, 'Query cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
    hitRate?: number;
  } {
    return {
      size: this.queryCache.size,
      maxSize: MAX_CACHE_SIZE,
      ttlMs: CACHE_TTL_MS,
    };
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.queryCache.clear();
    logger.info('NL Graph Query Service shut down');
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

/**
 * Shutdown the service (for graceful termination)
 */
export function shutdownNlGraphQueryService(): void {
  if (serviceInstance) {
    serviceInstance.shutdown();
    serviceInstance = null;
  }
}
