"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgMeshMetrics = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
const api_1 = require("@opentelemetry/api");
const { Counter, Gauge, Histogram, register } = prom_client_1.default;
class OrgMeshMetrics {
    static instance;
    tracer = api_1.trace.getTracer('org-mesh-twin');
    ingestDuration = new Histogram({
        name: 'org_mesh_ingest_duration_seconds',
        help: 'Duration of ingestion process',
        labelNames: ['source', 'status'],
    });
    graphNodesCount = new Gauge({
        name: 'org_mesh_graph_nodes_count',
        help: 'Number of nodes in the graph',
        labelNames: ['type'],
    });
    driftDetectionCount = new Counter({
        name: 'org_mesh_drift_detection_count',
        help: 'Number of drift detections',
        labelNames: ['severity', 'type'],
    });
    narrativeSignalsCount = new Counter({
        name: 'org_mesh_narrative_signals_count',
        help: 'Number of narrative signals detected',
        labelNames: ['campaign_type'],
    });
    agentActionSuccessRate = new Gauge({
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
const metrics = OrgMeshMetrics.getInstance();
exports.default = metrics;
