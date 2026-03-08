"use strict";
/**
 * Provenance Integration for Authority Compiler
 *
 * Connects authority decisions to the provenance ledger for audit trails.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvLedgerClient = exports.InMemoryProvenanceRecorder = void 0;
exports.withProvenanceRecording = withProvenanceRecording;
const uuid_1 = require("uuid");
// -----------------------------------------------------------------------------
// Default Provenance Recorder (In-Memory)
// -----------------------------------------------------------------------------
class InMemoryProvenanceRecorder {
    events = [];
    async recordEvent(event) {
        this.events.push(event);
    }
    async getEntityEvents(entityId) {
        return this.events.filter((e) => e.resource.id === entityId);
    }
    async getUserEvents(userId, limit = 100) {
        return this.events
            .filter((e) => e.userId === userId)
            .slice(-limit);
    }
    async generateAuditReport(options) {
        const filtered = this.events.filter((e) => {
            if (e.timestamp < options.startDate || e.timestamp > options.endDate) {
                return false;
            }
            if (options.userId && e.userId !== options.userId) {
                return false;
            }
            if (options.entityType && e.resource.type !== options.entityType) {
                return false;
            }
            if (options.investigationId && e.resource.investigationId !== options.investigationId) {
                return false;
            }
            if (!options.includeAllowed && e.decision.allowed) {
                return false;
            }
            if (!options.includeDenied && !e.decision.allowed) {
                return false;
            }
            return true;
        });
        const operationCounts = new Map();
        const uniqueUsers = new Set();
        let allowedCount = 0;
        let deniedCount = 0;
        for (const event of filtered) {
            uniqueUsers.add(event.userId);
            if (event.decision.allowed) {
                allowedCount++;
            }
            else {
                deniedCount++;
            }
            operationCounts.set(event.operation, (operationCounts.get(event.operation) || 0) + 1);
        }
        return {
            generatedAt: new Date(),
            period: { start: options.startDate, end: options.endDate },
            summary: {
                totalEvents: filtered.length,
                allowedCount,
                deniedCount,
                uniqueUsers: uniqueUsers.size,
                topOperations: Array.from(operationCounts.entries())
                    .map(([operation, count]) => ({ operation, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10),
            },
            events: filtered,
        };
    }
}
exports.InMemoryProvenanceRecorder = InMemoryProvenanceRecorder;
// -----------------------------------------------------------------------------
// Provenance Integration Middleware
// -----------------------------------------------------------------------------
/**
 * Create provenance recording wrapper for policy evaluator
 */
function withProvenanceRecording(evaluator, recorder) {
    const originalEvaluate = evaluator.evaluate.bind(evaluator);
    evaluator.evaluate = async (context) => {
        const decision = await originalEvaluate(context);
        // Record provenance event
        const event = {
            eventId: (0, uuid_1.v4)(),
            eventType: decision.allowed ? 'authority_grant' : 'authority_deny',
            timestamp: new Date(),
            userId: context.user.id,
            tenantId: context.user.tenantId,
            operation: context.operation,
            resource: {
                type: context.resource.entityType,
                id: context.resource.entityId,
                investigationId: context.resource.investigationId,
            },
            decision: {
                allowed: decision.allowed,
                authorityId: decision.authorityId,
                reason: decision.reason,
            },
            context: {
                ip: context.request.ip,
                userAgent: context.request.userAgent,
            },
            inputHash: hashContext(context),
        };
        await recorder.recordEvent(event);
        return decision;
    };
    return evaluator;
}
/**
 * Hash evaluation context for integrity
 */
function hashContext(context) {
    const data = JSON.stringify({
        userId: context.user.id,
        operation: context.operation,
        resourceType: context.resource.entityType,
        resourceId: context.resource.entityId,
        timestamp: context.request.timestamp.toISOString(),
    });
    // Simple hash for demo - use crypto.subtle.digest in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}
// -----------------------------------------------------------------------------
// Prov-Ledger Client
// -----------------------------------------------------------------------------
/**
 * Client for Summit's prov-ledger service
 */
class ProvLedgerClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async recordEvent(event) {
        await fetch(`${this.baseUrl}/claims`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: event.eventType,
                subject: event.userId,
                predicate: event.operation,
                object: event.resource.id || event.resource.type,
                metadata: {
                    tenantId: event.tenantId,
                    decision: event.decision,
                    context: event.context,
                },
                hash: event.inputHash,
            }),
        });
    }
    async getEntityEvents(entityId) {
        const response = await fetch(`${this.baseUrl}/provenance?entityId=${entityId}`);
        const data = await response.json();
        return data.events || [];
    }
    async getUserEvents(userId, limit = 100) {
        const response = await fetch(`${this.baseUrl}/provenance?userId=${userId}&limit=${limit}`);
        const data = await response.json();
        return data.events || [];
    }
    async generateAuditReport(options) {
        const params = new URLSearchParams({
            startDate: options.startDate.toISOString(),
            endDate: options.endDate.toISOString(),
        });
        if (options.userId) {
            params.set('userId', options.userId);
        }
        if (options.entityType) {
            params.set('entityType', options.entityType);
        }
        const response = await fetch(`${this.baseUrl}/audit/report?${params}`);
        return response.json();
    }
}
exports.ProvLedgerClient = ProvLedgerClient;
