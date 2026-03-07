export interface MetaOrchestratorCounters {
  nodesRegistered: number;
  deltasRecorded: number;
  assembliesCompleted: number;
  lastAssemblyDurationMs?: number;
}

function emit(event: string, payload: Record<string, unknown>): void {
  const entry = { timestamp: new Date().toISOString(), event, ...payload };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

export class MetaRouterTelemetry {
  private counters: MetaOrchestratorCounters = {
    nodesRegistered: 0,
    deltasRecorded: 0,
    assembliesCompleted: 0,
  };

  recordNode(kind: string, layer: string): void {
    this.counters.nodesRegistered += 1;
    emit("meta_router_node_registered", {
      kind,
      layer,
      nodesRegistered: this.counters.nodesRegistered,
    });
  }

  recordDelta(kind: string): void {
    this.counters.deltasRecorded += 1;
    emit("meta_router_delta_recorded", {
      kind,
      deltasRecorded: this.counters.deltasRecorded,
    });
  }

  recordAssembly(goal: string, nodeCount: number, deltaCount: number, durationMs: number): void {
    this.counters.assembliesCompleted += 1;
    this.counters.lastAssemblyDurationMs = durationMs;
    emit("meta_router_assembly_completed", {
      goal,
      nodeCount,
      deltaCount,
      durationMs,
      assembliesCompleted: this.counters.assembliesCompleted,
    });
  }

  snapshot(): MetaOrchestratorCounters {
    return { ...this.counters };
  }
}

export const metaOrchestratorTelemetry = new MetaRouterTelemetry();
