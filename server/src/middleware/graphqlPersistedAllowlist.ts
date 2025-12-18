import { readFileSync, existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import pino from 'pino';

const logger = pino({ name: 'graphqlPersistedAllowlist' });

interface PersistedAllowlistOptions {
  manifestPaths?: string[];
  /** Enforce allowlist only when NODE_ENV=production by default */
  enforceInProduction?: boolean;
  /** Allow non-persisted queries when not enforcing (useful for local dev) */
  allowDevFallback?: boolean;
}

type ManifestShape = Record<string, string>;

function hashQuery(query: string): string {
  return crypto.createHash('sha256').update(query.trim()).digest('hex');
}

function loadManifest(paths: string[]): Map<string, string> {
  const allowlist = new Map<string, string>();
  for (const manifestPath of paths) {
    try {
      if (!existsSync(manifestPath)) continue;
      const raw = readFileSync(manifestPath, 'utf8');
      const parsed: ManifestShape = JSON.parse(raw);
      const entries = Object.entries(parsed);

      if (!entries.length) continue;

      for (const [id, query] of entries) {
        const normalized = query.trim();
        allowlist.set(id, normalized);
        // Also allow APQ style hashes to match this query
        allowlist.set(hashQuery(normalized), normalized);
      }

      logger.info(
        {
          manifestPath,
          operations: entries.length,
        },
        'Persisted GraphQL allowlist loaded',
      );
    } catch (error) {
      logger.warn(
        {
          manifestPath,
          error: (error as Error).message,
        },
        'Failed to load persisted operations manifest – checking next path',
      );
    }
  }

  if (!allowlist.size) {
    logger.warn('No persisted operations manifest found; running without allowlist');
  }

  return allowlist;
}

export class GraphqlPersistedAllowlistMiddleware {
  private readonly allowlist: Map<string, string>;
  private readonly enforce: boolean;
  private readonly allowDevFallback: boolean;

  constructor(options: PersistedAllowlistOptions = {}) {
    const manifestPaths = (
      options.manifestPaths || [
        process.env.PERSISTED_OPERATIONS_PATH,
        path.join(process.cwd(), 'client/src/generated/graphql.json'),
        path.join(process.cwd(), 'persisted-operations.json'),
        path.join(process.cwd(), 'persisted-queries.json'),
      ]
    ).filter(Boolean) as string[];

    this.allowlist = loadManifest(manifestPaths);
    const isProd = process.env.NODE_ENV === 'production';
    this.enforce = options.enforceInProduction ?? isProd;
    this.allowDevFallback = options.allowDevFallback ?? !isProd;
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    if (!this.isGraphQLRequest(req)) return next();

    const body = this.getRequestPayload(req);
    // Ensure downstream middleware sees the normalized payload
    req.body = body;
    const enforcementEnabled = this.enforce;

    const resolvedQuery = this.resolvePersistedQuery(body);
    if (resolvedQuery) {
      req.body.query = resolvedQuery;
      return next();
    }

    if (!enforcementEnabled && this.allowDevFallback) {
      logger.warn(
        {
          path: req.path,
          operationName: body.operationName,
        },
        'Allowing non-persisted GraphQL query (development fallback)',
      );
      return next();
    }

    logger.warn(
      {
        path: req.path,
        operationName: body.operationName,
      },
      'Blocked GraphQL query – not found in persisted allowlist',
    );

    return res.status(403).json({
      errors: [
        {
          message: 'Persisted query required in production',
          extensions: {
            code: 'PERSISTED_QUERY_REQUIRED',
            operationName: body.operationName,
          },
        },
      ],
    });
  };

  private resolvePersistedQuery(body: Record<string, any>): string | undefined {
    // APQ hash
    const apqHash = body.extensions?.persistedQuery?.sha256Hash;
    if (apqHash && this.allowlist.has(apqHash)) {
      return this.allowlist.get(apqHash);
    }

    // Operation id
    if (body.id && this.allowlist.has(body.id)) {
      return this.allowlist.get(body.id);
    }

    // Inline query that matches allowlist hash
    if (body.query) {
      const queryHash = hashQuery(body.query);
      if (this.allowlist.has(queryHash)) {
        return body.query;
      }
    }

    return undefined;
  }

  private isGraphQLRequest(req: Request): boolean {
    return req.path === '/graphql' && (req.method === 'POST' || req.method === 'GET');
  }

  private parseMaybeJson(value: unknown) {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private getRequestPayload(req: Request): Record<string, any> {
    if (req.method === 'GET') {
      const queryParams = req.query || {};
      const normalized: Record<string, any> = {};

      for (const [key, value] of Object.entries(queryParams)) {
        if (Array.isArray(value)) continue;
        normalized[key] = this.parseMaybeJson(value);
      }

      return normalized;
    }

    return (req.body || {}) as Record<string, any>;
  }
}

export function createGraphqlPersistedAllowlistMiddleware(
  options?: PersistedAllowlistOptions,
) {
  const middleware = new GraphqlPersistedAllowlistMiddleware(options);
  return middleware.middleware;
}

export function hashPersistedQuery(query: string): string {
  return hashQuery(query);
}
