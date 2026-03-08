"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredEventEmitter = exports.EVENT_SCHEMAS = void 0;
exports.buildRunId = buildRunId;
const SENSITIVE_KEYS = ['secret', 'token', 'password', 'apiKey', 'credential'];
exports.EVENT_SCHEMAS = {
    'summit.maestro.run.created': {
        name: 'summit.maestro.run.created',
        version: '1.0',
        description: 'Run initialized with pipeline and stage metadata',
        required: ['runId', 'pipelineId', 'stageIds'],
        example: {
            runId: 'pipeline-123:1713811200',
            pipelineId: 'pipeline-123',
            stageIds: ['stage-a', 'stage-b'],
            metadata: { tenant: 'blue' },
        },
    },
    'summit.maestro.run.started': {
        name: 'summit.maestro.run.started',
        version: '1.0',
        description: 'Plan generated; orchestration entering execution',
        required: ['runId', 'pipelineId', 'stageCount', 'planScore'],
        example: {
            runId: 'pipeline-123:1713811200',
            pipelineId: 'pipeline-123',
            stageCount: 4,
            planScore: 0.82,
        },
    },
    'summit.maestro.run.completed': {
        name: 'summit.maestro.run.completed',
        version: '1.0',
        description: 'Execution finished successfully or in a degraded state',
        required: [
            'runId',
            'pipelineId',
            'status',
            'traceLength',
            'successCount',
            'recoveredCount',
            'durationMs',
        ],
        example: {
            runId: 'pipeline-123:1713811200',
            pipelineId: 'pipeline-123',
            status: 'success',
            traceLength: 5,
            successCount: 5,
            recoveredCount: 1,
            durationMs: 1200,
        },
    },
    'summit.maestro.run.failed': {
        name: 'summit.maestro.run.failed',
        version: '1.0',
        description: 'Execution aborted due to an unhandled failure',
        required: ['runId', 'pipelineId', 'reason'],
        example: {
            runId: 'pipeline-123:1713811200',
            pipelineId: 'pipeline-123',
            reason: 'fallbacks exhausted',
            failedStageId: 'stage-b',
            fatal: true,
        },
    },
    'summit.intelgraph.query.executed': {
        name: 'summit.intelgraph.query.executed',
        version: '1.0',
        description: 'IntelGraph snapshot/query executed',
        required: ['queryType', 'subjectId', 'durationMs', 'resultCount'],
        example: {
            queryType: 'service',
            subjectId: 'svc-api',
            durationMs: 42,
            resultCount: 3,
            riskScore: 0.71,
            incidentCount: 2,
        },
    },
    'summit.incident.detected': {
        name: 'summit.incident.detected',
        version: '1.0',
        description: 'Maestro detected an incident and generated a response plan',
        required: ['incidentId', 'assetId', 'severity', 'metric', 'timestamp'],
        example: {
            incidentId: 'svc-alpha:latency.p95:1713811200',
            assetId: 'svc-alpha',
            severity: 'high',
            metric: 'latency.p95',
            timestamp: new Date().toISOString(),
            plans: ['failover'],
        },
    },
    'summit.ai.eval.run': {
        name: 'summit.ai.eval.run',
        version: '1.0',
        description: 'AI eval lifecycle event',
        required: ['evalId', 'targetModel', 'dataset', 'status'],
        example: {
            evalId: 'eval-123',
            targetModel: 'gpt-4.1',
            dataset: 'alignment-suite',
            status: 'started',
            owner: 'ml-bench',
        },
    },
    'summit.intelgraph.graph.updated': {
        name: 'summit.intelgraph.graph.updated',
        version: '1.0',
        description: 'Knowledge graph snapshot updated from refresh or streaming source',
        required: ['source', 'ingress', 'trigger', 'version', 'nodeCount', 'edgeCount'],
        example: {
            source: 'confluent',
            ingress: 'message-broker',
            namespace: 'intelgraph',
            trigger: 'stream',
            version: 12,
            nodeCount: 420,
            edgeCount: 880,
            durationMs: 135,
            topic: 'intelgraph.updates',
            correlationId: 'trace-1234',
        },
    },
    'summit.intelgraph.agent.triggered': {
        name: 'summit.intelgraph.agent.triggered',
        version: '1.0',
        description: 'Agent reaction requested due to graph change',
        required: ['agent', 'reason'],
        example: {
            agent: 'incident-first-responder',
            reason: 'critical incident ingested from kafka topic incidents.high',
            priority: 'high',
            namespace: 'intelgraph',
            graphVersion: 12,
            correlationId: 'trace-1234',
            payload: { incidentId: 'inc-123', serviceId: 'svc-api' },
        },
    },
};
class StructuredEventEmitter {
    transport;
    redactions;
    constructor(options) {
        this.transport = options?.transport ?? ((event) => this.logAsJson(event));
        this.redactions = options?.redactKeys ?? SENSITIVE_KEYS;
    }
    emitEvent(name, payload, metadata) {
        const schema = exports.EVENT_SCHEMAS[name];
        if (!schema) {
            throw new Error(`No schema registered for event ${name}`);
        }
        const validation = this.validatePayload(schema, payload);
        if (!validation.valid) {
            throw new Error(validation.reason ?? `Invalid payload for ${name}: ${validation.missing?.join(', ')}`);
        }
        const envelope = {
            name: schema.name,
            version: schema.version,
            timestamp: new Date().toISOString(),
            correlationId: metadata?.correlationId,
            traceId: metadata?.traceId,
            runId: metadata?.runId,
            actor: metadata?.actor,
            context: metadata?.context,
            payload,
        };
        void this.transport(envelope);
        return envelope;
    }
    summarizeOutcome(outcome) {
        const stageIds = outcome.plan.steps.map((step) => step.stageId);
        const successCount = outcome.trace.filter((entry) => entry.status === 'success').length;
        const recoveredCount = outcome.trace.filter((entry) => entry.status === 'recovered').length;
        return {
            planScore: outcome.plan.aggregateScore,
            stageIds,
            successCount,
            recoveredCount,
        };
    }
    validatePayload(schema, payload) {
        const missing = schema.required.filter((key) => payload[key] === undefined || payload[key] === null);
        if (missing.length > 0) {
            return { valid: false, missing };
        }
        if (this.containsSensitiveKeys(payload)) {
            return { valid: false, reason: 'payload contains sensitive-looking keys' };
        }
        return { valid: true };
    }
    containsSensitiveKeys(payload) {
        return Object.keys(payload).some((key) => this.redactions.some((token) => key.toLowerCase().includes(token.toLowerCase())));
    }
    logAsJson(event) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(event));
    }
}
exports.StructuredEventEmitter = StructuredEventEmitter;
function buildRunId(plan, seed) {
    const base = `${plan.pipelineId}:${plan.generatedAt}`;
    return seed ? `${base}:${seed}` : base;
}
