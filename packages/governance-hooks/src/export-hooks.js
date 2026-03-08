"use strict";
/**
 * Export Governance Hooks
 *
 * Governance controls for data export operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportPolicyError = void 0;
exports.createExportAuthorityHook = createExportAuthorityHook;
exports.createExportClassificationHook = createExportClassificationHook;
exports.createExportFieldRedactionHook = createExportFieldRedactionHook;
exports.createExportAuditHook = createExportAuditHook;
exports.createExportManifestHook = createExportManifestHook;
exports.composeExportHooks = composeExportHooks;
function createExportAuthorityHook(config) {
    return {
        async beforeExport(request) {
            // Check reason requirement
            if (config.requireReason && !request.reason) {
                throw new ExportPolicyError('Export reason is required');
            }
            // Check entity count
            if (request.entityIds.length > config.maxEntities) {
                throw new ExportPolicyError(`Export exceeds maximum entity count of ${config.maxEntities}`);
            }
            // Evaluate export authority
            const decision = await config.evaluator.evaluate({
                user: { id: request.userId, tenantId: request.tenantId, roles: [] },
                operation: 'EXPORT',
                resource: { investigationId: request.investigationId },
                request: { timestamp: new Date(), justification: request.reason },
            });
            if (!decision.allowed) {
                throw new ExportPolicyError(decision.reason);
            }
            // Check two-person control
            if (decision.requiresTwoPersonControl) {
                throw new ExportPolicyError('This export requires two-person approval', {
                    twoPersonControlId: decision.twoPersonControlId,
                });
            }
            return request;
        },
    };
}
function createExportClassificationHook(config) {
    const classificationLevels = {
        UNCLASSIFIED: 0,
        CUI: 1,
        CONFIDENTIAL: 2,
        SECRET: 3,
        TOP_SECRET: 4,
    };
    return {
        async transformData(request, data) {
            const userClearance = await config.getUserClearance(request.userId);
            const userLevel = classificationLevels[userClearance] || 0;
            const maxLevel = classificationLevels[config.maxExportClassification] || 0;
            // Filter entities by classification
            const filteredEntities = data.entities.filter((entity) => {
                const entityClassification = entity.classification || 'UNCLASSIFIED';
                const entityLevel = classificationLevels[entityClassification] || 0;
                // Must be within user clearance AND max export level
                return entityLevel <= Math.min(userLevel, maxLevel);
            });
            // Get set of allowed entity IDs
            const allowedIds = new Set(filteredEntities.map((e) => e.id));
            // Filter relationships to only include those between allowed entities
            const filteredRelationships = data.relationships.filter((rel) => allowedIds.has(rel.from) && allowedIds.has(rel.to));
            return {
                ...data,
                entities: filteredEntities,
                relationships: filteredRelationships,
                metadata: {
                    ...data.metadata,
                    _filteredCount: data.entities.length - filteredEntities.length,
                    _maxClassification: config.maxExportClassification,
                },
            };
        },
    };
}
function createExportFieldRedactionHook(config) {
    return {
        async transformData(request, data) {
            const redactedEntities = data.entities.map((entity) => ({
                ...entity,
                props: redactProps(entity.props, config),
            }));
            const redactedRelationships = data.relationships.map((rel) => ({
                ...rel,
                props: rel.props ? redactProps(rel.props, config) : undefined,
            }));
            return {
                ...data,
                entities: redactedEntities,
                relationships: redactedRelationships,
            };
        },
    };
}
function redactProps(props, config) {
    const result = {};
    for (const [key, value] of Object.entries(props)) {
        // Check if field should be redacted
        if (config.redactedFields.includes(key)) {
            result[key] = '[REDACTED]';
            continue;
        }
        // Check for PII patterns in string values
        if (typeof value === 'string') {
            let redactedValue = value;
            for (const pattern of config.piiPatterns) {
                redactedValue = redactedValue.replace(pattern.regex, pattern.replacement);
            }
            result[key] = redactedValue;
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function createExportAuditHook(logger) {
    return {
        async beforeExport(request) {
            await logger.log({
                eventType: 'export_started',
                exportId: request.exportId,
                userId: request.userId,
                tenantId: request.tenantId,
                investigationId: request.investigationId,
                entityCount: request.entityIds.length,
                relationshipCount: 0,
                format: request.format,
                reason: request.reason,
                timestamp: new Date(),
            });
            return request;
        },
        async afterExport(request, data) {
            await logger.log({
                eventType: 'export_completed',
                exportId: request.exportId,
                userId: request.userId,
                tenantId: request.tenantId,
                investigationId: request.investigationId,
                entityCount: data.entities.length,
                relationshipCount: data.relationships.length,
                format: request.format,
                reason: request.reason,
                timestamp: new Date(),
            });
        },
    };
}
function createExportManifestHook(config) {
    return {
        async afterExport(request, data) {
            // Generate manifest (would use ExportManifestBuilder in production)
            const manifest = {
                version: '1.0',
                exportId: request.exportId,
                exportedAt: new Date().toISOString(),
                exportedBy: request.userId,
                tenantId: request.tenantId,
                contents: {
                    entityCount: data.entities.length,
                    relationshipCount: data.relationships.length,
                    format: request.format,
                },
                // Hash tree would be generated here
            };
            // Attach manifest to metadata
            data.metadata._manifest = manifest;
        },
    };
}
// -----------------------------------------------------------------------------
// Composite Hook
// -----------------------------------------------------------------------------
function composeExportHooks(...hooks) {
    return {
        async beforeExport(request) {
            let current = request;
            for (const hook of hooks) {
                if (hook.beforeExport && current) {
                    current = await hook.beforeExport(current);
                }
            }
            return current;
        },
        async transformData(request, data) {
            let current = data;
            for (const hook of hooks) {
                if (hook.transformData) {
                    current = await hook.transformData(request, current);
                }
            }
            return current;
        },
        async afterExport(request, data) {
            for (const hook of hooks) {
                if (hook.afterExport) {
                    await hook.afterExport(request, data);
                }
            }
        },
    };
}
// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------
class ExportPolicyError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.name = 'ExportPolicyError';
        this.details = details;
    }
}
exports.ExportPolicyError = ExportPolicyError;
