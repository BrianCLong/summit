"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const ledger_js_1 = require("../../provenance/ledger.js");
const index_js_1 = require("../../audit/index.js");
const { isEqual } = lodash_1.default;
const ELASTIC_URL = process.env.ELASTICSEARCH_URL;
const LOG_FILE = process.env.AUDIT_LOG_FILE || 'audit-log.jsonl';
const ANONYMIZE = process.env.AUDIT_LOG_ANONYMIZE === 'true';
const anonymize = (value) => {
    if (value === null || value === undefined)
        return value;
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.map(() => '[redacted]');
        }
        return Object.keys(value).reduce((acc, key) => ({ ...acc, [key]: anonymize(value[key]) }), {});
    }
    return '[redacted]';
};
const auditLoggerPlugin = {
    async requestDidStart() {
        const start = new Date();
        return {
            async willSendResponse(ctx) {
                const operation = ctx.operation;
                if (!operation || operation.operation !== 'mutation') {
                    return;
                }
                const entity = operation.selectionSet.selections[0]?.name?.value ||
                    'unknown';
                const userId = ctx.contextValue?.user?.id ?? null;
                const tenantId = ctx.contextValue?.user?.tenantId || 'unknown-tenant';
                const requestId = ctx.request.http?.headers.get('x-request-id') || undefined;
                const correlationId = ctx.request.http?.headers.get('x-correlation-id') || undefined;
                const before = ctx.contextValue?.audit?.before;
                const after = ctx.contextValue?.audit?.after ||
                    (ctx.response.body.kind === 'single'
                        ? ctx.response.body.singleResult?.data?.[entity]
                        : undefined);
                const diff = {};
                if (before &&
                    after &&
                    typeof before === 'object' &&
                    typeof after === 'object') {
                    const keys = new Set([
                        ...Object.keys(before),
                        ...Object.keys(after),
                    ]);
                    for (const key of keys) {
                        const b = before[key];
                        const a = after[key];
                        if (!isEqual(b, a)) {
                            diff[key] = {
                                before: ANONYMIZE ? anonymize(b) : b,
                                after: ANONYMIZE ? anonymize(a) : a,
                            };
                        }
                    }
                }
                const logEntry = {
                    timestamp: start.toISOString(),
                    userId: ANONYMIZE ? anonymize(userId) : userId,
                    operation: operation.operation,
                    entity,
                    diff,
                };
                // Log to Advanced Audit System
                try {
                    (0, index_js_1.getAuditSystem)().recordEvent({
                        eventType: 'resource_modify', // Mutations modify resources
                        action: entity, // Use mutation name as action
                        outcome: ctx.errors ? 'failure' : 'success',
                        userId: userId || 'anonymous',
                        tenantId,
                        serviceId: 'graphql-api',
                        resourceType: 'entity',
                        resourceId: entity,
                        message: `GraphQL Mutation: ${entity}`,
                        level: 'info',
                        requestId,
                        correlationId,
                        details: {
                            diff,
                            operationName: ctx.request.operationName,
                            variables: ANONYMIZE ? {} : ctx.request.variables,
                        },
                        complianceRelevant: true, // Mutations are usually relevant
                    });
                }
                catch (error) {
                    if (process.env.NODE_ENV !== 'test') {
                        console.error('Failed to log to Advanced Audit System', error);
                    }
                }
                // Stamp to Provenance Ledger
                try {
                    await ledger_js_1.provenanceLedger.appendEntry({
                        tenantId,
                        actionType: 'GRAPHQL_MUTATION',
                        resourceType: entity,
                        resourceId: entity, // We might not have specific ID easily here
                        actorId: userId || 'anonymous',
                        actorType: userId ? 'user' : 'system',
                        payload: logEntry,
                        metadata: {
                            requestId,
                            correlationId,
                        },
                    });
                }
                catch (error) {
                    console.error('Failed to stamp GraphQL mutation to Provenance Ledger', error);
                }
                try {
                    if (ELASTIC_URL) {
                        await axios_1.default.post(`${ELASTIC_URL}/audit/_doc`, logEntry, {
                            timeout: 2000,
                        });
                    }
                    else {
                        // throw new Error('No Elasticsearch URL'); // Suppress to avoid noise
                    }
                }
                catch (_err) {
                    // Fallback only if no other system is working
                    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
                        fs_1.default.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
                    }
                }
            },
        };
    },
};
exports.default = auditLoggerPlugin;
