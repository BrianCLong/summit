/**
 * Summit Query Language (SummitQL)
 *
 * A declarative, GraphQL-inspired query language for intelligence analysis
 *
 * @example
 * ```typescript
 * import { SummitQL } from '@intelgraph/query-language';
 *
 * const ql = new SummitQL();
 *
 * const query = `
 *   query {
 *     from: entities
 *     select: [id, name, type, relationships { id, type }]
 *     where: type = "Person" AND country IN ["US", "UK"]
 *     order_by: [name ASC]
 *     limit: 100
 *   }
 * `;
 *
 * const result = await ql.execute(query);
 * ```
 */

import { tokenize } from './parser/lexer';
import { parse } from './parser/parser';
import { QueryCompiler, type CompilerOptions } from './compiler/compiler';
import type {
  Query,
  QueryResult,
  StreamingQueryResult,
  ValidationResult,
  ExecutionPlan,
} from './types';

export * from './types';
export * from './parser';
export * from './compiler';

export interface SummitQLOptions extends CompilerOptions {
  // Execution options
  executor?: QueryExecutor;
  cache?: QueryCache;
  logger?: Logger;
}

export interface QueryExecutor {
  execute<T = any>(plan: ExecutionPlan): Promise<QueryResult<T>>;
  stream<T = any>(plan: ExecutionPlan): AsyncIterable<StreamingQueryResult<T>>;
}

export interface QueryCache {
  get(key: string): Promise<any | null>;
  set(key: string, value: any, ttl: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

export class SummitQL {
  private compiler: QueryCompiler;
  private executor?: QueryExecutor;
  private cache?: QueryCache;
  private logger?: Logger;

  constructor(options: SummitQLOptions = {}) {
    this.compiler = new QueryCompiler(options);
    this.executor = options.executor;
    this.cache = options.cache;
    this.logger = options.logger;
  }

  /**
   * Parse a query string into an AST
   */
  parse(queryString: string) {
    this.logger?.debug('Parsing query', { query: queryString });

    try {
      const lexResult = tokenize(queryString);
      const ast = parse(lexResult.tokens);
      return ast;
    } catch (error) {
      this.logger?.error('Parse error', { error });
      throw error;
    }
  }

  /**
   * Compile a query string into an execution plan
   */
  compile(queryString: string): ExecutionPlan {
    this.logger?.debug('Compiling query', { query: queryString });

    try {
      const ast = this.parse(queryString);
      const plan = this.compiler.compile(ast);
      return plan;
    } catch (error) {
      this.logger?.error('Compilation error', { error });
      throw error;
    }
  }

  /**
   * Validate a query string
   */
  validate(queryString: string): ValidationResult {
    this.logger?.debug('Validating query', { query: queryString });

    try {
      const ast = this.parse(queryString);
      return this.compiler.validate(ast);
    } catch (error) {
      this.logger?.error('Validation error', { error });
      return {
        valid: false,
        errors: [
          {
            message: error instanceof Error ? error.message : String(error),
            code: 'PARSE_ERROR',
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Execute a query and return results
   */
  async execute<T = any>(queryString: string, options?: {
    cache?: boolean;
    cacheTTL?: number;
  }): Promise<QueryResult<T>> {
    this.logger?.info('Executing query', { query: queryString });

    const startTime = Date.now();

    try {
      // Check cache if enabled
      if (options?.cache && this.cache) {
        const cacheKey = this.generateCacheKey(queryString);
        const cached = await this.cache.get(cacheKey);

        if (cached) {
          this.logger?.debug('Cache hit', { key: cacheKey });
          return {
            ...cached,
            metadata: {
              ...cached.metadata,
              cached: true,
            },
          };
        }
      }

      // Compile query
      const plan = this.compile(queryString);

      // Execute query
      if (!this.executor) {
        throw new Error('No executor configured');
      }

      const result = await this.executor.execute<T>(plan);

      // Cache result if enabled
      if (options?.cache && this.cache) {
        const cacheKey = this.generateCacheKey(queryString);
        const ttl = options.cacheTTL || 3600;
        await this.cache.set(cacheKey, result, ttl);
      }

      const executionTime = Date.now() - startTime;

      this.logger?.info('Query executed successfully', {
        executionTime,
        rowCount: result.data.length,
      });

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime,
        },
      };
    } catch (error) {
      this.logger?.error('Execution error', { error });
      throw error;
    }
  }

  /**
   * Stream query results
   */
  async *stream<T = any>(queryString: string): AsyncIterable<StreamingQueryResult<T>> {
    this.logger?.info('Streaming query', { query: queryString });

    try {
      const plan = this.compile(queryString);

      if (!this.executor) {
        throw new Error('No executor configured');
      }

      yield* this.executor.stream<T>(plan);
    } catch (error) {
      this.logger?.error('Streaming error', { error });
      yield {
        type: 'error',
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'STREAM_ERROR',
        },
      };
    }
  }

  /**
   * Explain a query (show execution plan)
   */
  explain(queryString: string): string {
    this.logger?.debug('Explaining query', { query: queryString });

    try {
      const ast = this.parse(queryString);
      return this.compiler.explainQuery(ast);
    } catch (error) {
      this.logger?.error('Explain error', { error });
      throw error;
    }
  }

  /**
   * Generate a cache key for a query
   */
  private generateCacheKey(queryString: string): string {
    // Simple hash function for demo (use crypto.createHash in production)
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `query:${hash}`;
  }
}

// ===== Export Default Instance =====

export const ql = new SummitQL();
