"use strict";
/**
 * Audit Event Capture Middleware for GraphQL
 * Automatically captures all mutations to the event store for complete audit trails
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventCaptureMiddleware = void 0;
exports.createAuditEventCaptureMiddleware = createAuditEventCaptureMiddleware;
const EventSourcingService_js_1 = require("../services/EventSourcingService.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const middlewareLogger = logger_js_1.default.child({ name: 'AuditEventCaptureMiddleware' });
// ============================================================================
// AUDIT EVENT CAPTURE MIDDLEWARE
// ============================================================================
class AuditEventCaptureMiddleware {
    pg;
    eventSourcingService;
    // Mutations that should be excluded from audit capture
    excludedMutations = new Set([
        'login',
        'logout',
        'refreshToken',
        'healthCheck',
    ]);
    // Map mutation names to aggregate types
    mutationToAggregateMap = {
        // Case mutations
        createCase: 'case',
        updateCase: 'case',
        deleteCase: 'case',
        archiveCase: 'case',
        closeCase: 'case',
        reopenCase: 'case',
        // Entity mutations
        createEntity: 'entity',
        updateEntity: 'entity',
        deleteEntity: 'entity',
        mergeEntities: 'entity',
        // Relationship mutations
        createRelationship: 'relationship',
        updateRelationship: 'relationship',
        deleteRelationship: 'relationship',
        // Investigation mutations
        createInvestigation: 'investigation',
        updateInvestigation: 'investigation',
        deleteInvestigation: 'investigation',
        // Document/Evidence mutations
        uploadDocument: 'document',
        updateDocument: 'document',
        deleteDocument: 'document',
        // User mutations
        createUser: 'user',
        updateUser: 'user',
        deleteUser: 'user',
        updateUserRole: 'user',
        // Permission mutations
        grantPermission: 'permission',
        revokePermission: 'permission',
    };
    constructor(pg) {
        this.pg = pg;
        this.eventSourcingService = new EventSourcingService_js_1.EventSourcingService(pg);
    }
    /**
     * Apollo Server plugin for mutation auditing
     */
    createApolloPlugin() {
        const self = this;
        return {
            async requestDidStart() {
                return {
                    async didResolveOperation(requestContext) {
                        // Only process mutations
                        if (requestContext.operation?.operation !== 'mutation') {
                            return;
                        }
                        const operationName = requestContext.operationName;
                        const context = requestContext.context;
                        middlewareLogger.debug({ operationName }, 'Mutation operation detected');
                    },
                    async willSendResponse(requestContext) {
                        // Only process mutations
                        if (requestContext.operation?.operation !== 'mutation') {
                            return;
                        }
                        const context = requestContext.context;
                        const operation = requestContext.operation;
                        const errors = requestContext.errors;
                        // Extract mutation details
                        const mutationSelections = operation.selectionSet.selections;
                        for (const selection of mutationSelections) {
                            if (selection.kind === 'Field') {
                                const mutationName = selection.name.value;
                                // Skip excluded mutations
                                if (self.excludedMutations.has(mutationName)) {
                                    continue;
                                }
                                // Extract arguments
                                const args = {};
                                if (selection.arguments) {
                                    for (const arg of selection.arguments) {
                                        args[arg.name.value] = self.extractArgumentValue(arg.value, requestContext.request.variables || {});
                                    }
                                }
                                // Extract result from response data
                                const result = requestContext.response?.data?.[mutationName];
                                // Capture the mutation as an event
                                await self.captureMutationEvent({
                                    mutationName,
                                    operationType: 'mutation',
                                    args,
                                    result,
                                    error: errors?.[0],
                                }, context);
                            }
                        }
                    },
                };
            },
        };
    }
    /**
     * Express-style middleware for capturing mutation events
     */
    createExpressMiddleware() {
        return async (req, res, next) => {
            // Store original end method
            const originalEnd = res.end;
            // Override res.end to capture response
            res.end = async (chunk, encoding, callback) => {
                // Only process GraphQL mutations
                if (req.body &&
                    req.body.query &&
                    req.body.query.includes('mutation')) {
                    try {
                        // Parse the response if it's JSON
                        let responseData;
                        if (chunk) {
                            try {
                                responseData = JSON.parse(chunk.toString());
                            }
                            catch (e) {
                                // Not JSON, skip
                            }
                        }
                        // Extract context from request
                        const context = {
                            user: req.user,
                            tenantId: req.headers['x-tenant-id'] || req.user?.tenantId,
                            requestId: req.id || req.headers['x-request-id'],
                            sessionId: req.sessionID || req.headers['x-session-id'],
                            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                            userAgent: req.headers['user-agent'],
                            correlationId: req.headers['x-correlation-id'],
                        };
                        // Log the mutation (basic - detailed capture happens in Apollo plugin)
                        middlewareLogger.debug({
                            operationName: req.body.operationName,
                            userId: context.user?.id,
                            tenantId: context.tenantId,
                        }, 'GraphQL mutation captured');
                    }
                    catch (error) {
                        middlewareLogger.error({ error: error.message }, 'Failed to capture mutation in middleware');
                    }
                }
                // Call original end method
                return originalEnd.call(res, chunk, encoding, callback);
            };
            next();
        };
    }
    /**
     * Capture mutation as a domain event
     */
    async captureMutationEvent(mutation, context) {
        try {
            // Determine aggregate type from mutation name
            const aggregateType = this.mutationToAggregateMap[mutation.mutationName] || 'unknown';
            // Extract aggregate ID from arguments or result
            const aggregateId = this.extractAggregateId(mutation);
            // Skip if we can't determine the aggregate ID
            if (!aggregateId) {
                middlewareLogger.warn({ mutationName: mutation.mutationName }, 'Could not extract aggregate ID from mutation');
                return;
            }
            // Determine event type from mutation name
            const eventType = this.determineEventType(mutation.mutationName);
            // Extract old and new values if available
            const { oldValues, newValues } = this.extractStateChanges(mutation);
            // Build domain event
            const event = {
                eventType,
                aggregateType,
                aggregateId,
                eventData: {
                    mutationName: mutation.mutationName,
                    args: mutation.args,
                    result: mutation.result,
                    success: !mutation.error,
                    error: mutation.error
                        ? {
                            message: mutation.error.message,
                            stack: mutation.error.stack,
                        }
                        : undefined,
                    oldValues,
                    newValues,
                },
                eventMetadata: {
                    source: 'graphql_mutation',
                    operationType: 'mutation',
                },
                tenantId: context.tenantId || context.user?.tenantId || 'unknown',
                userId: context.user?.id || 'system',
                correlationId: context.correlationId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                sessionId: context.sessionId,
                requestId: context.requestId,
                dataClassification: this.determineDataClassification(aggregateType),
                retentionPolicy: this.determineRetentionPolicy(aggregateType),
            };
            // Append to event store
            await this.eventSourcingService.appendEvent(event);
            middlewareLogger.info({
                eventType,
                aggregateType,
                aggregateId,
                mutationName: mutation.mutationName,
                userId: event.userId,
                tenantId: event.tenantId,
            }, 'Mutation captured as domain event');
        }
        catch (error) {
            // Log error but don't fail the mutation
            middlewareLogger.error({
                error: error.message,
                mutationName: mutation.mutationName,
            }, 'Failed to capture mutation event');
        }
    }
    /**
     * Extract aggregate ID from mutation arguments or result
     */
    extractAggregateId(mutation) {
        // Try to get ID from arguments
        if (mutation.args.id) {
            return mutation.args.id;
        }
        if (mutation.args.input?.id) {
            return mutation.args.input.id;
        }
        // Try to get ID from result
        if (mutation.result?.id) {
            return mutation.result.id;
        }
        // For create mutations, the result might have the new ID
        if (mutation.mutationName.startsWith('create') &&
            mutation.result) {
            return mutation.result.id || mutation.result._id || null;
        }
        return null;
    }
    /**
     * Determine event type from mutation name
     */
    determineEventType(mutationName) {
        if (mutationName.startsWith('create')) {
            return mutationName.replace('create', '') + 'Created';
        }
        if (mutationName.startsWith('update')) {
            return mutationName.replace('update', '') + 'Updated';
        }
        if (mutationName.startsWith('delete')) {
            return mutationName.replace('delete', '') + 'Deleted';
        }
        if (mutationName.startsWith('archive')) {
            return mutationName.replace('archive', '') + 'Archived';
        }
        if (mutationName.startsWith('close')) {
            return mutationName.replace('close', '') + 'Closed';
        }
        if (mutationName.startsWith('reopen')) {
            return mutationName.replace('reopen', '') + 'Reopened';
        }
        // Default: use mutation name as event type
        return mutationName;
    }
    /**
     * Extract state changes (old vs new values)
     */
    extractStateChanges(mutation) {
        let oldValues;
        let newValues;
        // For update mutations, extract the changes
        if (mutation.mutationName.startsWith('update')) {
            if (mutation.args.input) {
                newValues = { ...mutation.args.input };
                if (newValues)
                    delete newValues.id; // Remove ID from change
            }
            // If the result includes both old and new values, use them
            if (mutation.result?.oldValues) {
                oldValues = mutation.result.oldValues;
            }
            if (mutation.result?.newValues) {
                newValues = mutation.result.newValues;
            }
        }
        // For create mutations, all values are "new"
        if (mutation.mutationName.startsWith('create')) {
            newValues = mutation.args.input || mutation.args;
        }
        // For delete mutations, capture what was deleted
        if (mutation.mutationName.startsWith('delete')) {
            oldValues = mutation.result || mutation.args;
        }
        return { oldValues, newValues };
    }
    /**
     * Determine data classification based on aggregate type
     */
    determineDataClassification(aggregateType) {
        const classificationMap = {
            user: 'PII',
            case: 'INTERNAL',
            investigation: 'CONFIDENTIAL',
            document: 'INTERNAL',
            entity: 'INTERNAL',
            relationship: 'INTERNAL',
            permission: 'INTERNAL',
        };
        return classificationMap[aggregateType] || 'INTERNAL';
    }
    /**
     * Determine retention policy based on aggregate type
     */
    determineRetentionPolicy(aggregateType) {
        const policyMap = {
            user: 'GDPR_PERSONAL_DATA',
            case: 'INVESTIGATION_DATA',
            investigation: 'INVESTIGATION_DATA',
            document: 'EVIDENCE',
            entity: 'INVESTIGATION_DATA',
            relationship: 'INVESTIGATION_DATA',
            permission: 'AUDIT_LOG',
        };
        return policyMap[aggregateType] || 'STANDARD';
    }
    /**
     * Extract argument value (handles variables)
     */
    extractArgumentValue(value, variables) {
        if (value.kind === 'Variable') {
            return variables[value.name.value];
        }
        if (value.kind === 'ObjectValue') {
            const obj = {};
            for (const field of value.fields) {
                obj[field.name.value] = this.extractArgumentValue(field.value, variables);
            }
            return obj;
        }
        if (value.kind === 'ListValue') {
            return value.values.map((v) => this.extractArgumentValue(v, variables));
        }
        // Primitive values
        return value.value;
    }
}
exports.AuditEventCaptureMiddleware = AuditEventCaptureMiddleware;
/**
 * Factory function to create the middleware
 */
function createAuditEventCaptureMiddleware(pg) {
    return new AuditEventCaptureMiddleware(pg);
}
