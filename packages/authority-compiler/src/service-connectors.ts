/**
 * Service Connectors for Authority Compiler
 *
 * Pre-built integrations for Summit platform services.
 */

import type { EvaluationContext } from './evaluator';
import type { Operation } from './schema/policy.schema';

// -----------------------------------------------------------------------------
// GraphQL Integration
// -----------------------------------------------------------------------------

/**
 * Extract operation from GraphQL resolver info
 */
export function getOperationFromGraphQL(info: any): Operation {
  const operationType = info.operation?.operation;
  const fieldName = info.fieldName?.toLowerCase() || '';

  // Map GraphQL operations to policy operations
  if (operationType === 'mutation') {
    if (fieldName.startsWith('create')) return 'CREATE';
    if (fieldName.startsWith('update')) return 'UPDATE';
    if (fieldName.startsWith('delete')) return 'DELETE';
    if (fieldName.includes('export')) return 'EXPORT';
    if (fieldName.includes('share')) return 'SHARE';
    return 'UPDATE'; // Default for mutations
  }

  if (operationType === 'subscription') {
    return 'READ';
  }

  // Query operations
  if (fieldName.includes('copilot') || fieldName.includes('ai')) return 'COPILOT';
  return 'READ';
}

/**
 * Extract resource context from GraphQL resolver info
 */
export function getResourceFromGraphQL(info: any, args: any): EvaluationContext['resource'] {
  const returnType = info.returnType?.ofType?.name || info.returnType?.name;

  return {
    entityType: returnType,
    entityId: args?.id,
    investigationId: args?.investigationId || args?.input?.investigationId,
  };
}

/**
 * Create GraphQL context extension for authority
 */
export function createGraphQLAuthorityContext(evaluator: any) {
  return {
    async authorize(operation: Operation, resource: EvaluationContext['resource']) {
      // This would be called from resolvers
      return evaluator.evaluate({
        user: this.user,
        operation,
        resource,
        request: {
          timestamp: new Date(),
          ip: this.req?.ip,
          userAgent: this.req?.get?.('User-Agent'),
        },
      });
    },
  };
}

// -----------------------------------------------------------------------------
// REST API Integration
// -----------------------------------------------------------------------------

/**
 * Map HTTP method to policy operation
 */
export function httpMethodToOperation(method: string): Operation {
  switch (method.toUpperCase()) {
    case 'GET':
    case 'HEAD':
    case 'OPTIONS':
      return 'READ';
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'READ';
  }
}

/**
 * Extract resource from REST request path
 */
export function getResourceFromPath(path: string, params: Record<string, string>): EvaluationContext['resource'] {
  // Parse path segments to determine resource type
  const segments = path.split('/').filter(Boolean);

  // Common patterns:
  // /api/entities/:id -> entityType: 'Entity', entityId: params.id
  // /api/investigations/:id/entities -> investigationId: params.id
  // /api/persons/:id -> entityType: 'Person', entityId: params.id

  const resourceMap: Record<string, string> = {
    entities: 'Entity',
    persons: 'Person',
    organizations: 'Organization',
    assets: 'Asset',
    locations: 'Location',
    events: 'Event',
    documents: 'Document',
    claims: 'Claim',
    cases: 'Case',
    investigations: 'Investigation',
  };

  let entityType: string | undefined;
  let entityId: string | undefined;
  let investigationId: string | undefined;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];

    if (resourceMap[segment]) {
      entityType = resourceMap[segment];
      if (nextSegment && !resourceMap[nextSegment]) {
        entityId = nextSegment;
      }
    }

    if (segment === 'investigations' && nextSegment) {
      investigationId = nextSegment;
    }
  }

  return {
    entityType,
    entityId: entityId || params.id,
    investigationId: investigationId || params.investigationId,
  };
}

// -----------------------------------------------------------------------------
// Copilot Integration
// -----------------------------------------------------------------------------

/**
 * Authority context for AI Copilot requests
 */
export interface CopilotAuthorityContext {
  /** Check if user can execute copilot queries */
  canQuery: boolean;
  /** Check if user can access specific investigation */
  canAccessInvestigation: (investigationId: string) => Promise<boolean>;
  /** Get redacted fields for copilot responses */
  getRedactedFields: () => string[];
  /** Get maximum result limit */
  getMaxResults: () => number;
  /** Log copilot access for audit */
  logAccess: (query: string, resultCount: number) => Promise<void>;
}

/**
 * Create copilot authority context
 */
export function createCopilotAuthorityContext(
  evaluator: any,
  user: EvaluationContext['user'],
  auditLogger: any
): CopilotAuthorityContext {
  let cachedDecision: any = null;

  return {
    get canQuery() {
      return true; // Would check COPILOT operation
    },

    async canAccessInvestigation(investigationId: string) {
      const decision = await evaluator.evaluate({
        user,
        operation: 'COPILOT',
        resource: { investigationId },
        request: { timestamp: new Date() },
      });
      cachedDecision = decision;
      return decision.allowed;
    },

    getRedactedFields() {
      return cachedDecision?.redactedFields || [];
    },

    getMaxResults() {
      return cachedDecision?.maxResults || 1000;
    },

    async logAccess(query: string, resultCount: number) {
      await auditLogger?.log({
        action: 'COPILOT_QUERY',
        userId: user.id,
        query: query.substring(0, 500), // Truncate for audit
        resultCount,
        authorityId: cachedDecision?.authorityId,
      });
    },
  };
}

// -----------------------------------------------------------------------------
// Connector Integration
// -----------------------------------------------------------------------------

/**
 * Authority context for data connectors
 */
export interface ConnectorAuthorityContext {
  /** Tenant ID for data isolation */
  tenantId: string;
  /** Default classification for ingested data */
  defaultClassification: string;
  /** Compartments to apply to ingested data */
  compartments: string[];
  /** Check if connector can ingest data */
  canIngest: boolean;
  /** Check if connector can read from source */
  canRead: boolean;
  /** Apply authority labels to entity */
  applyLabels: (entity: any) => any;
}

/**
 * Create connector authority context
 */
export function createConnectorAuthorityContext(
  config: any,
  evaluator: any
): ConnectorAuthorityContext {
  return {
    tenantId: config.tenantId,
    defaultClassification: config.defaultClassification || 'UNCLASSIFIED',
    compartments: config.compartments || [],
    canIngest: true, // Would evaluate against policy
    canRead: true,

    applyLabels(entity: any) {
      return {
        ...entity,
        tenantId: config.tenantId,
        classification: entity.classification || config.defaultClassification,
        compartments: [...(entity.compartments || []), ...config.compartments],
      };
    },
  };
}

// -----------------------------------------------------------------------------
// Export Integration
// -----------------------------------------------------------------------------

/**
 * Authority context for export operations
 */
export interface ExportAuthorityContext {
  /** Check if export is allowed */
  allowed: boolean;
  /** Requires two-person control */
  requiresTwoPersonControl: boolean;
  /** Two-person control workflow ID */
  twoPersonControlId?: string;
  /** Fields to redact in export */
  redactedFields: string[];
  /** Maximum entities to export */
  maxEntities: number;
  /** Approval ID (if two-person control satisfied) */
  approvalId?: string;
}

/**
 * Evaluate export authority
 */
export async function evaluateExportAuthority(
  evaluator: any,
  user: EvaluationContext['user'],
  entityIds: string[],
  investigationId?: string
): Promise<ExportAuthorityContext> {
  const decision = await evaluator.evaluate({
    user,
    operation: 'EXPORT',
    resource: {
      entityType: 'Export',
      investigationId,
    },
    request: { timestamp: new Date() },
  });

  return {
    allowed: decision.allowed,
    requiresTwoPersonControl: decision.requiresTwoPersonControl,
    twoPersonControlId: decision.twoPersonControlId,
    redactedFields: decision.redactedFields || [],
    maxEntities: decision.maxResults || 10000,
  };
}

// -----------------------------------------------------------------------------
// RAG Integration
// -----------------------------------------------------------------------------

/**
 * Build vector search filter from authority context
 */
export function buildRAGAuthorityFilter(
  user: EvaluationContext['user']
): Record<string, any> {
  const filters: any = {
    tenant_id: user.tenantId,
  };

  // Add compartment filter if user has compartments
  if (user.compartments && user.compartments.length > 0) {
    filters.compartments = { $in: user.compartments };
  }

  // Add classification filter based on clearance
  if (user.clearance) {
    const clearanceLevels: Record<string, string[]> = {
      UNCLASSIFIED: ['UNCLASSIFIED'],
      CUI: ['UNCLASSIFIED', 'CUI'],
      CONFIDENTIAL: ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL'],
      SECRET: ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET'],
      TOP_SECRET: ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'],
    };
    filters.classification = { $in: clearanceLevels[user.clearance] || ['UNCLASSIFIED'] };
  }

  return filters;
}
