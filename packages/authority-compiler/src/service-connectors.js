"use strict";
/**
 * Service Connectors for Authority Compiler
 *
 * Pre-built integrations for Summit platform services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationFromGraphQL = getOperationFromGraphQL;
exports.getResourceFromGraphQL = getResourceFromGraphQL;
exports.createGraphQLAuthorityContext = createGraphQLAuthorityContext;
exports.httpMethodToOperation = httpMethodToOperation;
exports.getResourceFromPath = getResourceFromPath;
exports.createCopilotAuthorityContext = createCopilotAuthorityContext;
exports.createConnectorAuthorityContext = createConnectorAuthorityContext;
exports.evaluateExportAuthority = evaluateExportAuthority;
exports.buildRAGAuthorityFilter = buildRAGAuthorityFilter;
// -----------------------------------------------------------------------------
// GraphQL Integration
// -----------------------------------------------------------------------------
/**
 * Extract operation from GraphQL resolver info
 */
function getOperationFromGraphQL(info) {
    const operationType = info.operation?.operation;
    const fieldName = info.fieldName?.toLowerCase() || '';
    // Map GraphQL operations to policy operations
    if (operationType === 'mutation') {
        if (fieldName.startsWith('create')) {
            return 'CREATE';
        }
        if (fieldName.startsWith('update')) {
            return 'UPDATE';
        }
        if (fieldName.startsWith('delete')) {
            return 'DELETE';
        }
        if (fieldName.includes('export')) {
            return 'EXPORT';
        }
        if (fieldName.includes('share')) {
            return 'SHARE';
        }
        return 'UPDATE'; // Default for mutations
    }
    if (operationType === 'subscription') {
        return 'READ';
    }
    // Query operations
    if (fieldName.includes('copilot') || fieldName.includes('ai')) {
        return 'COPILOT';
    }
    return 'READ';
}
/**
 * Extract resource context from GraphQL resolver info
 */
function getResourceFromGraphQL(info, args) {
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
function createGraphQLAuthorityContext(evaluator) {
    return {
        async authorize(operation, resource) {
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
function httpMethodToOperation(method) {
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
function getResourceFromPath(path, params) {
    // Parse path segments to determine resource type
    const segments = path.split('/').filter(Boolean);
    // Common patterns:
    // /api/entities/:id -> entityType: 'Entity', entityId: params.id
    // /api/investigations/:id/entities -> investigationId: params.id
    // /api/persons/:id -> entityType: 'Person', entityId: params.id
    const resourceMap = {
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
    let entityType;
    let entityId;
    let investigationId;
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
/**
 * Create copilot authority context
 */
function createCopilotAuthorityContext(evaluator, user, auditLogger) {
    let cachedDecision = null;
    return {
        get canQuery() {
            return true; // Would check COPILOT operation
        },
        async canAccessInvestigation(investigationId) {
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
        async logAccess(query, resultCount) {
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
/**
 * Create connector authority context
 */
function createConnectorAuthorityContext(config, evaluator) {
    return {
        tenantId: config.tenantId,
        defaultClassification: config.defaultClassification || 'UNCLASSIFIED',
        compartments: config.compartments || [],
        canIngest: true, // Would evaluate against policy
        canRead: true,
        applyLabels(entity) {
            return {
                ...entity,
                tenantId: config.tenantId,
                classification: entity.classification || config.defaultClassification,
                compartments: [...(entity.compartments || []), ...config.compartments],
            };
        },
    };
}
/**
 * Evaluate export authority
 */
async function evaluateExportAuthority(evaluator, user, entityIds, investigationId) {
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
function buildRAGAuthorityFilter(user) {
    const filters = {
        tenant_id: user.tenantId,
    };
    // Add compartment filter if user has compartments
    if (user.compartments && user.compartments.length > 0) {
        filters.compartments = { $in: user.compartments };
    }
    // Add classification filter based on clearance
    if (user.clearance) {
        const clearanceLevels = {
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
