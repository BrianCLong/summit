/**
 * Persisted Query Enforcer: Production security for GraphQL mutations
 * Two-phase rollout: log violations → enforce with emergency bypass
 */

import crypto from 'crypto';
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import logger from '../../utils/logger';

// Feature flags for rollout phases
const PQ_PHASE = process.env.PQ_PHASE ?? 'log'; // "log" | "enforce"
const EMERGENCY_BYPASS = process.env.PQ_BYPASS === '1'; // Emergency escape hatch
const ALLOW_INTROSPECTION = process.env.PQ_INTROSPECTION === '1';

// Health check operations that are always allowed
const ALLOW_HEALTH = new Set(['Health', 'Ping', 'Status', 'Readiness']);

// Canary tenants for gradual rollout
const CANARY_TENANTS = new Set(
  (process.env.SAFE_MUTATIONS_CANARY_TENANTS || 'test,demo,maestro-internal')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
);

interface PersistedQueryConfig {
  phase: 'log' | 'enforce';
  emergencyBypass: boolean;
  allowIntrospection: boolean;
  allowHealth: Set<string>;
  canaryTenants: Set<string>;
  enforceForCanariesOnly: boolean;
}

/**
 * In-memory allowlist for demo. In production, this would be:
 * - Redis set with TTL
 * - Database table with periodic refresh
 * - Build-time generated from schema analysis
 */
class PersistedQueryAllowlist {
  private allowlist = new Set<string>();
  private stats = {
    violations: 0,
    allowed: 0,
    bypassed: 0,
    lastUpdate: new Date(),
  };

  /**
   * Set the allowlist of permitted query hashes
   */
  setAllowlist(hashes: string[]): void {
    this.allowlist = new Set(hashes);
    this.stats.lastUpdate = new Date();

    logger.info('Persisted query allowlist updated', {
      count: hashes.length,
      phase: PQ_PHASE,
    });
  }

  /**
   * Add query hashes to allowlist
   */
  addToAllowlist(hashes: string[]): void {
    hashes.forEach((hash) => this.allowlist.add(hash));

    logger.debug('Added hashes to persisted query allowlist', {
      added: hashes.length,
      total: this.allowlist.size,
    });
  }

  /**
   * Check if query hash is in allowlist
   */
  isAllowed(hash: string): boolean {
    return this.allowlist.has(hash);
  }

  /**
   * Get current allowlist statistics
   */
  getStats() {
    return {
      ...this.stats,
      allowlistSize: this.allowlist.size,
    };
  }

  /**
   * Record violation for metrics
   */
  recordViolation(): void {
    this.stats.violations++;
  }

  /**
   * Record allowed operation for metrics
   */
  recordAllowed(): void {
    this.stats.allowed++;
  }

  /**
   * Record emergency bypass for metrics
   */
  recordBypass(): void {
    this.stats.bypassed++;
  }
}

// Global allowlist instance
const allowlist = new PersistedQueryAllowlist();

/**
 * Generate SHA256 hash of GraphQL query string
 */
function sha256(query: string): string {
  return crypto.createHash('sha256').update(query.trim()).digest('hex');
}

/**
 * Extract operation name from GraphQL query
 */
function extractOperationName(query: string): string | null {
  const operationMatch = query.match(
    /(?:mutation|query|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/,
  );
  return operationMatch?.[1] || null;
}

/**
 * Check if tenant is in canary rollout
 */
function isCanaryTenant(tenantId: string | undefined): boolean {
  return tenantId ? CANARY_TENANTS.has(tenantId) : false;
}

/**
 * Apollo Server plugin for persisted query enforcement
 */
export function persistedEnforcer(
  config?: Partial<PersistedQueryConfig>,
): ApolloServerPlugin {
  const pluginConfig: PersistedQueryConfig = {
    phase: (config?.phase || PQ_PHASE) as 'log' | 'enforce',
    emergencyBypass: config?.emergencyBypass ?? EMERGENCY_BYPASS,
    allowIntrospection: config?.allowIntrospection ?? ALLOW_INTROSPECTION,
    allowHealth: config?.allowHealth ?? ALLOW_HEALTH,
    canaryTenants: config?.canaryTenants ?? CANARY_TENANTS,
    enforceForCanariesOnly: config?.enforceForCanariesOnly ?? true,
  };

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      return {
        async didResolveOperation(requestContext) {
          // Emergency bypass - skip all checks
          if (pluginConfig.emergencyBypass) {
            allowlist.recordBypass();
            logger.warn(
              'Persisted query enforcement bypassed (emergency mode)',
              {
                operationName: requestContext.operationName,
                phase: pluginConfig.phase,
              },
            );
            return;
          }

          const operation = requestContext.operation?.operation;
          const operationName = requestContext.operationName;

          // Only enforce on mutations
          if (operation !== 'mutation') {
            // Allow health check queries
            if (
              operation === 'query' &&
              operationName &&
              pluginConfig.allowHealth.has(operationName)
            ) {
              allowlist.recordAllowed();
              return;
            }

            // Allow introspection if enabled
            if (
              operationName === 'IntrospectionQuery' &&
              pluginConfig.allowIntrospection
            ) {
              allowlist.recordAllowed();
              return;
            }

            // For non-mutations, only log in enforce phase
            if (pluginConfig.phase === 'enforce') {
              logger.debug('Non-mutation query in enforce mode', {
                operation,
                operationName,
              });
            }

            return;
          }

          // Extract tenant and user info
          const tenantId =
            requestContext.contextValue?.user?.tenantId ||
            requestContext.contextValue?.tenantId ||
            requestContext.request.http?.headers.get('x-tenant-id');

          const userId =
            requestContext.contextValue?.user?.id ||
            requestContext.request.http?.headers.get('x-user-id');

          // Check if enforcement applies to this tenant
          if (
            pluginConfig.enforceForCanariesOnly &&
            !isCanaryTenant(tenantId)
          ) {
            allowlist.recordAllowed();
            logger.debug(
              'Non-canary tenant - skipping persisted query enforcement',
              {
                tenantId,
                operationName,
              },
            );
            return;
          }

          // Get query hash (support both APQ and raw query hashing)
          const rawQuery = (requestContext.request as any)?.body?.query;
          const apqHash = (requestContext.request as any)?.body?.extensions
            ?.persistedQuery?.sha256Hash;
          const isAPQ = !!apqHash;

          let queryHash: string;

          if (isAPQ) {
            queryHash = apqHash;
          } else if (rawQuery) {
            queryHash = sha256(rawQuery);
          } else {
            // No query provided at all
            throw new GraphQLError('No GraphQL query provided', {
              extensions: {
                code: 'MISSING_QUERY',
                phase: pluginConfig.phase,
              },
            });
          }

          // Check allowlist
          const isAllowed = allowlist.isAllowed(queryHash);

          const logContext = {
            operationName,
            tenantId,
            userId,
            queryHash,
            isAPQ,
            isAllowed,
            phase: pluginConfig.phase,
            canaryTenant: isCanaryTenant(tenantId),
          };

          if (isAllowed) {
            allowlist.recordAllowed();
            logger.debug('Persisted query allowed', logContext);
            return;
          }

          // Query not in allowlist - violation detected
          allowlist.recordViolation();

          if (pluginConfig.phase === 'log') {
            // Log phase: record violation but allow execution
            logger.warn('PERSISTED_QUERY_VIOLATION (logging only)', logContext);
            return;
          } else {
            // Enforce phase: block execution
            logger.error('PERSISTED_QUERY_VIOLATION (blocked)', logContext);

            throw new GraphQLError(
              'Persisted queries required for mutations in production. ' +
                'Please use pre-approved mutation queries or contact support.',
              {
                extensions: {
                  code: 'PERSISTED_QUERY_REQUIRED',
                  operationName,
                  tenantId,
                  queryHash,
                  phase: pluginConfig.phase,
                  timestamp: new Date().toISOString(),
                },
              },
            );
          }
        },
      };
    },
  };
}

/**
 * Set the persisted query allowlist
 */
export function setPersistedAllowlist(hashes: string[]): void {
  allowlist.setAllowlist(hashes);
}

/**
 * Add queries to the allowlist
 */
export function addToPersistedAllowlist(hashes: string[]): void {
  allowlist.addToAllowlist(hashes);
}

/**
 * Generate hash for a GraphQL query (utility for building allowlists)
 */
export function hashQuery(query: string): string {
  return sha256(query);
}

/**
 * Get enforcement statistics for monitoring
 */
export function getPersistedQueryStats() {
  return {
    ...allowlist.getStats(),
    phase: PQ_PHASE,
    emergencyBypass: EMERGENCY_BYPASS,
    canaryTenants: Array.from(CANARY_TENANTS),
  };
}

/**
 * Generate allowlist from schema (build-time utility)
 */
export async function generateAllowlistFromSchema(
  schemaPath: string,
): Promise<string[]> {
  // This would analyze your GraphQL schema and extract all valid mutations
  // For now, return common IntelGraph mutations
  const commonMutations = [
    // Entity operations
    `mutation CreateEntity($input: EntityInput!) {
      createEntity(input: $input) @budget(capUSD: 0.10, tokenCeiling: 5000) {
        id kind props createdAt
      }
    }`,

    // Relationship operations
    `mutation CreateRelationship($input: RelationshipInput!) {
      createRelationship(input: $input) @budget(capUSD: 0.05, tokenCeiling: 2000) {
        id type createdAt
      }
    }`,

    // Investigation operations
    `mutation CreateInvestigation($input: InvestigationInput!) {
      createInvestigation(input: $input) @budget(capUSD: 0.02, tokenCeiling: 1000) {
        id name status createdAt
      }
    }`,

    // Safe mutations with various budget levels
    `mutation SafeNoop {
      ping @budget(capUSD: 0.01, tokenCeiling: 100)
    }`,

    // Bulk operations
    `mutation BulkCreateEntities($input: BulkEntityInput!) {
      bulkCreateEntities(input: $input) @budget(capUSD: 1.00, tokenCeiling: 50000) {
        created { id }
        errors { message }
      }
    }`,
  ];

  return commonMutations.map((query) => hashQuery(query));
}

/**
 * Initialize with common mutations for development
 */
export async function initializeDevAllowlist(): Promise<void> {
  const hashes = await generateAllowlistFromSchema('');
  setPersistedAllowlist(hashes);

  logger.info('Development persisted query allowlist initialized', {
    count: hashes.length,
    phase: PQ_PHASE,
  });
}

/**
 * Express middleware to manage allowlist via API
 */
export function createPersistedQueryAPI() {
  return (req: any, res: any, next: any) => {
    if (req.path === '/admin/persisted-queries' && req.method === 'GET') {
      res.json(getPersistedQueryStats());
    } else if (
      req.path === '/admin/persisted-queries/allowlist' &&
      req.method === 'POST'
    ) {
      const { hashes, action = 'set' } = req.body;

      if (!Array.isArray(hashes)) {
        return res.status(400).json({ error: 'hashes must be an array' });
      }

      if (action === 'set') {
        setPersistedAllowlist(hashes);
      } else if (action === 'add') {
        addToPersistedAllowlist(hashes);
      } else {
        return res.status(400).json({ error: 'action must be "set" or "add"' });
      }

      res.json({
        success: true,
        action,
        count: hashes.length,
        stats: getPersistedQueryStats(),
      });
    } else {
      next();
    }
  };
}
