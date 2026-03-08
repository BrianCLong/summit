"use strict";
/**
 * Metrics Shim for Demo
 *
 * NOTE: This file duplicates logic from @intelgraph/metrics/src/org-mesh.ts
 * solely because the runtime environment (tsx) is failing to resolve the workspace
 * package imports correctly during the demo execution.
 *
 * In production, use: import { metrics } from '@intelgraph/metrics';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.metrics = exports.OrgMeshMetrics = void 0;
const prom_client_1 = require("prom-client");
Object.defineProperty(exports, "register", { enumerable: true, get: function () { return prom_client_1.register; } });
const api_1 = require("@opentelemetry/api");
class OrgMeshMetrics {
    static instance;
    tracer = api_1.trace.getTracer('org-mesh-twin');
    ingestDuration = new prom_client_1.Histogram({
        name: 'org_mesh_ingest_duration_seconds',
        help: 'Duration of ingestion process',
        labelNames: ['source', 'status'],
    });
    graphNodesCount = new prom_client_1.Gauge({
        name: 'org_mesh_graph_nodes_count',
        help: 'Number of nodes in the graph',
        labelNames: ['type'],
    });
    driftDetectionCount = new prom_client_1.Counter({
        name: 'org_mesh_drift_detection_count',
        help: 'Number of drift detections',
        labelNames: ['severity', 'type'],
    });
    narrativeSignalsCount = new prom_client_1.Counter({
        name: 'org_mesh_narrative_signals_count',
        help: 'Number of narrative signals detected',
        labelNames: ['campaign_type'],
    });
    agentActionSuccessRate = new prom_client_1.Gauge({
        name: 'org_mesh_agent_action_success_rate',
        help: 'Success rate of agent actions',
        labelNames: ['agent_id'],
    });
    constructor() { }
    static getInstance() {
        if (!OrgMeshMetrics.instance) {
            OrgMeshMetrics.instance = new OrgMeshMetrics();
        }
        return OrgMeshMetrics.instance;
    }
    async traceOperation(operationName, fn) {
        // Basic tracing simulation if no SDK is active
        return this.tracer.startActiveSpan(operationName, async (span) => {
            try {
                const result = await fn();
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error.message,
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
}
exports.OrgMeshMetrics = OrgMeshMetrics;
exports.metrics = OrgMeshMetrics.getInstance();
