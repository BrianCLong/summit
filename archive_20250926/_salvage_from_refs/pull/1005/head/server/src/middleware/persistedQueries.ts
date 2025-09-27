/**
 * Persisted Queries Middleware
 * 
 * Enforces persisted query allowlist in production and provides
 * development-friendly mode for local development.
 */

import { Request, Response, NextFunction } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import pino from 'pino';

const logger: pino.Logger = pino({ name: 'persistedQueries' });

interface PersistedQueriesConfig {
  manifestPath?: string;
  enforceInProduction: boolean;
  allowIntrospection: boolean;
  allowPlayground: boolean;
}

interface GraphQLRequest {
  query?: string;
  operationName?: string;
  variables?: Record<string, any>;
  extensions?: {
    persistedQuery?: {
      version: number;
      sha256Hash: string;
    };
  };
  id?: string; // Direct query ID
}

export class PersistedQueriesMiddleware {
  private manifest: Record<string, string> = {};
  private config: PersistedQueriesConfig;
  private isProduction: boolean;

  constructor(config: Partial<PersistedQueriesConfig> = {}) {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    this.config = {
      manifestPath: config.manifestPath || join(process.cwd(), 'persisted-operations.json'),
      enforceInProduction: config.enforceInProduction ?? true,
      allowIntrospection: config.allowIntrospection ?? !this.isProduction,
      allowPlayground: config.allowPlayground ?? !this.isProduction
    };

    this.loadManifest();
  }

  /**
   * Load persisted queries manifest
   */
  private loadManifest(): void {
    try {
      if (existsSync(this.config.manifestPath!)) {
        const manifestContent = readFileSync(this.config.manifestPath!, 'utf8');
        this.manifest = JSON.parse(manifestContent);
        
        logger.info(`Persisted queries manifest loaded. Operation Count: ${Object.keys(this.manifest).length}, Manifest Path: ${this.config.manifestPath}`);
      } else {
        logger.warn(`Persisted queries manifest not found. Manifest Path: ${this.config.manifestPath}`);
      }
    } catch (error) {
      logger.error(`Failed to load persisted queries manifest. Error: ${error instanceof Error ? error.message : 'Unknown error'}, Manifest Path: ${this.config.manifestPath}`);
    }
  }

  /**
   * Express middleware for persisted query enforcement
   */
  middleware = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip non-GraphQL requests
      if (!this.isGraphQLRequest(req)) {
        return next();
      }

      // Development mode - allow all queries but log warnings
      if (!this.isProduction && !this.config.enforceInProduction) {
        this.handleDevelopmentMode(req);
        return next();
      }

      // Production mode - enforce allowlist
      try {
        this.enforcePersistedQueries(req, res, next);
      } catch (error) {
        logger.error(`Persisted query enforcement failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}, Path: ${req.path}`);
        
        res.status(500).json({
          errors: [{
            message: 'Internal server error',
            extensions: { code: 'INTERNAL_ERROR' }
          }]
        });
      }
    };
  };

  /**
   * Check if request is a GraphQL request
   */
  private isGraphQLRequest(req: Request): boolean {
    return req.path === '/graphql' || req.path.includes('graphql');
  }

  /**
   * Handle development mode (allow all but warn about non-persisted)
   */
  private handleDevelopmentMode(req: Request): void {
    const body = req.body as GraphQLRequest;
    
    if (body.query && !this.isQueryInManifest(body.query)) {
      logger.warn(`Non-persisted query in development mode. Operation Name: ${body.operationName}, Query Hash: ${this.hashQuery(body.query).substring(0, 8)}`);
    }
  }

  /**
   * Enforce persisted queries in production
   */
  private enforcePersistedQueries(req: Request, res: Response, next: NextFunction): void {
    const body = req.body as GraphQLRequest;

    // Handle introspection queries
    if (this.isIntrospectionQuery(body.query)) {
      if (!this.config.allowIntrospection) {
        return this.rejectRequest(res, 'Introspection is disabled');
      }
      return next();
    }

    // Handle Apollo Persisted Queries protocol
    if (body.extensions?.persistedQuery) {
      const hash = body.extensions.persistedQuery.sha256Hash;
      if (this.manifest[hash]) {
        // Inject the query from manifest
        req.body = {
          ...body,
          query: this.manifest[hash]
        };
        return next();
      } else {
        return this.rejectRequest(res, 'Persisted query not found', { hash });
      }
    }

    // Handle direct query ID
    if (body.id && this.manifest[body.id]) {
      req.body = {
        ...body,
        query: this.manifest[body.id]
      };
      return next();
    }

    // Handle raw queries - only allowed if in manifest
    if (body.query) {
      const queryHash = this.hashQuery(body.query);
      if (this.manifest[queryHash]) {
        return next();
      } else {
        return this.rejectRequest(res, 'Query not in persisted operations allowlist', {
          operationName: body.operationName,
          queryHash: queryHash.substring(0, 8)
        });
      }
    }

    // No valid query found
    this.rejectRequest(res, 'No valid query provided');
  }

  /**
   * Check if query is in the manifest
   */
  private isQueryInManifest(query: string): boolean {
    const hash = this.hashQuery(query);
    return !!this.manifest[hash];
  }

  /**
   * Check if query is an introspection query
   */
  private isIntrospectionQuery(query?: string): boolean {
    if (!query) return false;
    return query.includes('__schema') || query.includes('__type');
  }

  /**
   * Hash a query string for manifest lookup
   */
  private hashQuery(query: string): string {
    return createHash('sha256').update(query.trim()).digest('hex');
  }

  /**
   * Reject a request with appropriate error
   */
  private rejectRequest(res: Response, message: string, metadata?: Record<string, any>): void {
    logger.warn(`Persisted query request rejected. Message: ${message}, Metadata: ${JSON.stringify(metadata)}`);
    
    res.status(403).json({
      errors: [{
        message,
        extensions: {
          code: 'PERSISTED_QUERY_NOT_FOUND',
          ...metadata
        }
      }]
    });
  }

  /**
   * Get middleware statistics
   */
  getStats(): {
    manifestLoaded: boolean;
    operationCount: number;
    isProduction: boolean;
    enforcing: boolean;
  } {
    return {
      manifestLoaded: Object.keys(this.manifest).length > 0,
      operationCount: Object.keys(this.manifest).length,
      isProduction: this.isProduction,
      enforcing: this.isProduction && this.config.enforceInProduction
    };
  }

  /**
   * Reload manifest (useful for development)
   */
  reloadManifest(): void {
    this.loadManifest();
  }
}

// Default instance for easy usage
export const persistedQueries = new PersistedQueriesMiddleware();

// Factory function for custom configuration
export function createPersistedQueriesMiddleware(config: Partial<PersistedQueriesConfig> = {}) {
  return new PersistedQueriesMiddleware(config);
}