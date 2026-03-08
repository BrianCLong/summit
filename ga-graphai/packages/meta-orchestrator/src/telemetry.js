"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaOrchestratorTelemetry = exports.MetaRouterTelemetry = void 0;
function emit(event, payload) {
    const entry = { timestamp: new Date().toISOString(), event, ...payload };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
}
class MetaRouterTelemetry {
    counters = {
        nodesRegistered: 0,
        deltasRecorded: 0,
        assembliesCompleted: 0,
    };
    recordNode(kind, layer) {
        this.counters.nodesRegistered += 1;
        emit('meta_router_node_registered', {
            kind,
            layer,
            nodesRegistered: this.counters.nodesRegistered,
        });
    }
    recordDelta(kind) {
        this.counters.deltasRecorded += 1;
        emit('meta_router_delta_recorded', {
            kind,
            deltasRecorded: this.counters.deltasRecorded,
        });
    }
    recordAssembly(goal, nodeCount, deltaCount, durationMs) {
        this.counters.assembliesCompleted += 1;
        this.counters.lastAssemblyDurationMs = durationMs;
        emit('meta_router_assembly_completed', {
            goal,
            nodeCount,
            deltaCount,
            durationMs,
            assembliesCompleted: this.counters.assembliesCompleted,
        });
    }
    snapshot() {
        return { ...this.counters };
    }
}
exports.MetaRouterTelemetry = MetaRouterTelemetry;
exports.metaOrchestratorTelemetry = new MetaRouterTelemetry();
