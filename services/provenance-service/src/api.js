"use strict";
/**
 * Provenance Service - API Layer
 *
 * RESTful API for recording and querying provenance records.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceAPI = exports.InMemoryProvenanceStore = void 0;
// ============================================================================
// IN-MEMORY IMPLEMENTATION (for development/testing)
// ============================================================================
class InMemoryProvenanceStore {
    records = new Map();
    taskIndex = new Map(); // taskId -> recordIds
    agentIndex = new Map(); // agentId -> recordIds
    sequenceCounter = BigInt(0);
    async write(record) {
        const id = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const payloadHash = await this.hashPayload(record.payload);
        const stored = {
            ...record,
            id,
            timestamp,
            payloadHash,
            sequenceNumber: this.sequenceCounter++,
            partitionKey: record.taskId,
        };
        this.records.set(id, stored);
        // Update indexes
        const taskRecords = this.taskIndex.get(record.taskId) ?? [];
        taskRecords.push(id);
        this.taskIndex.set(record.taskId, taskRecords);
        if (record.agentId) {
            const agentRecords = this.agentIndex.get(record.agentId) ?? [];
            agentRecords.push(id);
            this.agentIndex.set(record.agentId, agentRecords);
        }
        return id;
    }
    async read(recordId) {
        return this.records.get(recordId) ?? null;
    }
    async query(params) {
        let results = [];
        if (params.taskId) {
            const recordIds = this.taskIndex.get(params.taskId) ?? [];
            results = recordIds.map((id) => this.records.get(id)).filter(Boolean);
        }
        else if (params.agentId) {
            const recordIds = this.agentIndex.get(params.agentId) ?? [];
            results = recordIds.map((id) => this.records.get(id)).filter(Boolean);
        }
        else {
            results = Array.from(this.records.values());
        }
        // Apply filters
        if (params.eventTypes?.length) {
            results = results.filter((r) => params.eventTypes.includes(r.type));
        }
        if (params.startTime) {
            results = results.filter((r) => r.timestamp >= params.startTime);
        }
        if (params.endTime) {
            results = results.filter((r) => r.timestamp <= params.endTime);
        }
        // Sort
        const direction = params.orderDirection === 'desc' ? -1 : 1;
        results.sort((a, b) => {
            if (params.orderBy === 'sequence') {
                return Number(a.sequenceNumber - b.sequenceNumber) * direction;
            }
            return a.timestamp.localeCompare(b.timestamp) * direction;
        });
        // Pagination
        const offset = params.offset ?? 0;
        const limit = params.limit ?? 100;
        return results.slice(offset, offset + limit);
    }
    async getChain(taskId) {
        const records = await this.query({ taskId, orderBy: 'timestamp', orderDirection: 'asc' });
        if (records.length === 0) {
            return {
                rootTaskId: taskId,
                records: [],
                totalRecords: 0,
                agents: [],
                models: [],
                tools: [],
                policies: [],
                timespan: {
                    start: '',
                    end: '',
                    durationMs: 0,
                },
                cost: {
                    totalTokens: 0,
                    totalCostUsd: 0,
                    byProvider: {},
                    byModel: {},
                },
            };
        }
        // Aggregate data
        const agentMap = new Map();
        const modelStats = new Map();
        const toolStats = new Map();
        const policyStats = new Map();
        for (const record of records) {
            // Agent tracking
            if (record.agentId) {
                const agent = agentMap.get(record.agentId) ?? { name: '', role: '', tasks: 0, first: record.timestamp, last: record.timestamp };
                agent.tasks++;
                agent.last = record.timestamp;
                agentMap.set(record.agentId, agent);
            }
            // Model call tracking
            if (record.type === 'model_call' && record.payload.type === 'model_call') {
                const payload = record.payload;
                const key = `${payload.provider}:${payload.model}`;
                const stats = modelStats.get(key) ?? { calls: 0, tokensIn: 0, tokensOut: 0, latency: [] };
                stats.calls++;
                stats.tokensIn += payload.tokensIn;
                stats.tokensOut += payload.tokensOut;
                stats.latency.push(payload.latencyMs);
                modelStats.set(key, stats);
            }
            // Tool call tracking
            if (record.type === 'tool_invocation' && record.payload.type === 'tool_invocation') {
                const payload = record.payload;
                const stats = toolStats.get(payload.toolName) ?? { calls: 0, success: 0, latency: [] };
                stats.calls++;
                if (payload.success)
                    stats.success++;
                stats.latency.push(payload.latencyMs);
                toolStats.set(payload.toolName, stats);
            }
            // Policy tracking
            if (record.type === 'policy_decision' && record.payload.type === 'policy_decision') {
                const payload = record.payload;
                for (const policyId of payload.policyIds) {
                    const stats = policyStats.get(policyId) ?? { evals: 0, allow: 0, deny: 0, redact: 0, escalate: 0 };
                    stats.evals++;
                    if (payload.action === 'allow')
                        stats.allow++;
                    if (payload.action === 'deny')
                        stats.deny++;
                    if (payload.action === 'allow_with_redactions')
                        stats.redact++;
                    if (payload.action === 'escalate_to_human')
                        stats.escalate++;
                    policyStats.set(policyId, stats);
                }
            }
        }
        const firstRecord = records[0];
        const lastRecord = records[records.length - 1];
        return {
            rootTaskId: taskId,
            records,
            totalRecords: records.length,
            agents: Array.from(agentMap.entries()).map(([id, data]) => ({
                agentId: id,
                name: data.name,
                role: data.role,
                taskCount: data.tasks,
                firstSeen: data.first,
                lastSeen: data.last,
            })),
            models: Array.from(modelStats.entries()).map(([key, stats]) => {
                const [provider, model] = key.split(':');
                return {
                    provider: provider,
                    model,
                    callCount: stats.calls,
                    totalTokensIn: stats.tokensIn,
                    totalTokensOut: stats.tokensOut,
                    totalCostUsd: 0, // Would calculate from pricing
                    avgLatencyMs: stats.latency.reduce((a, b) => a + b, 0) / stats.latency.length,
                };
            }),
            tools: Array.from(toolStats.entries()).map(([name, stats]) => ({
                toolName: name,
                callCount: stats.calls,
                successCount: stats.success,
                failureCount: stats.calls - stats.success,
                avgLatencyMs: stats.latency.reduce((a, b) => a + b, 0) / stats.latency.length,
            })),
            policies: Array.from(policyStats.entries()).map(([id, stats]) => ({
                policyId: id,
                evaluationCount: stats.evals,
                allowCount: stats.allow,
                denyCount: stats.deny,
                redactionCount: stats.redact,
                escalationCount: stats.escalate,
            })),
            timespan: {
                start: firstRecord.timestamp,
                end: lastRecord.timestamp,
                durationMs: new Date(lastRecord.timestamp).getTime() - new Date(firstRecord.timestamp).getTime(),
            },
            cost: {
                totalTokens: Array.from(modelStats.values()).reduce((sum, s) => sum + s.tokensIn + s.tokensOut, 0),
                totalCostUsd: 0,
                byProvider: {},
                byModel: {},
            },
        };
    }
    async graphQuery(_query) {
        // Simplified implementation - would use Neo4j in production
        return {
            nodes: [],
            relationships: [],
            paths: [],
        };
    }
    async verifyIntegrity(taskId) {
        const records = await this.query({ taskId, orderBy: 'sequence', orderDirection: 'asc' });
        const entries = [];
        let previousHash = '0'.repeat(64);
        let allValid = true;
        for (const record of records) {
            const computedHash = await this.hashPayload(record.payload);
            const chainHash = await this.hashString(previousHash + computedHash);
            const valid = computedHash === record.payloadHash;
            if (!valid)
                allValid = false;
            entries.push({
                recordId: record.id,
                payloadHash: record.payloadHash,
                previousHash,
                chainHash,
                timestamp: record.timestamp,
            });
            previousHash = chainHash;
        }
        return {
            taskId,
            entries,
            rootHash: previousHash,
            verified: allValid,
            verifiedAt: new Date().toISOString(),
        };
    }
    async generateAuditReport(scope) {
        let records = [];
        if (scope.type === 'task' && scope.taskId) {
            records = await this.query({ taskId: scope.taskId });
        }
        else if (scope.type === 'agent' && scope.agentId) {
            records = await this.query({ agentId: scope.agentId });
        }
        else if (scope.type === 'timerange') {
            records = await this.query({ startTime: scope.startTime, endTime: scope.endTime });
        }
        const recordsByType = {};
        const agents = new Set();
        for (const record of records) {
            recordsByType[record.type] = (recordsByType[record.type] ?? 0) + 1;
            if (record.agentId)
                agents.add(record.agentId);
        }
        const integrity = scope.taskId ? await this.verifyIntegrity(scope.taskId) : null;
        return {
            reportId: crypto.randomUUID(),
            generatedAt: new Date().toISOString(),
            scope,
            summary: {
                totalRecords: records.length,
                recordsByType,
                agentsInvolved: agents.size,
                modelCallCount: recordsByType['model_call'] ?? 0,
                toolCallCount: recordsByType['tool_invocation'] ?? 0,
                policyViolations: 0,
                integrityStatus: integrity?.verified ? 'valid' : 'unknown',
            },
            findings: [],
            recommendations: [],
        };
    }
    async hashPayload(payload) {
        return this.hashString(JSON.stringify(payload));
    }
    async hashString(data) {
        const encoder = new TextEncoder();
        const buffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
}
exports.InMemoryProvenanceStore = InMemoryProvenanceStore;
// ============================================================================
// API HANDLER
// ============================================================================
class ProvenanceAPI {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * POST /api/v1/provenance
     */
    async createRecord(body) {
        const recordId = await this.store.write(body);
        return { recordId };
    }
    /**
     * GET /api/v1/provenance/:id
     */
    async getRecord(recordId) {
        return this.store.read(recordId);
    }
    /**
     * GET /api/v1/provenance/task/:taskId
     */
    async getTaskProvenance(taskId) {
        return this.store.getChain(taskId);
    }
    /**
     * POST /api/v1/provenance/query
     */
    async queryRecords(params) {
        return this.store.query(params);
    }
    /**
     * POST /api/v1/provenance/graph
     */
    async graphQuery(query) {
        return this.store.graphQuery(query);
    }
    /**
     * GET /api/v1/provenance/task/:taskId/verify
     */
    async verifyIntegrity(taskId) {
        return this.store.verifyIntegrity(taskId);
    }
    /**
     * POST /api/v1/provenance/audit
     */
    async generateAuditReport(scope) {
        return this.store.generateAuditReport(scope);
    }
}
exports.ProvenanceAPI = ProvenanceAPI;
