/**
 * Metrics Shim for Demo
 *
 * NOTE: This file duplicates logic from @intelgraph/metrics/src/org-mesh.ts
 * solely because the runtime environment (tsx) is failing to resolve the workspace
 * package imports correctly during the demo execution.
 *
 * In production, use: import { metrics } from '@intelgraph/metrics';
 */

import { Counter, Gauge, Histogram, register } from 'prom-client';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export class OrgMeshMetrics {
  private static instance: OrgMeshMetrics;
  private tracer = trace.getTracer('org-mesh-twin');

  public ingestDuration = new Histogram({
    name: 'org_mesh_ingest_duration_seconds',
    help: 'Duration of ingestion process',
    labelNames: ['source', 'status'],
  });

  public graphNodesCount = new Gauge({
    name: 'org_mesh_graph_nodes_count',
    help: 'Number of nodes in the graph',
    labelNames: ['type'],
  });

  public driftDetectionCount = new Counter({
    name: 'org_mesh_drift_detection_count',
    help: 'Number of drift detections',
    labelNames: ['severity', 'type'],
  });

  public narrativeSignalsCount = new Counter({
    name: 'org_mesh_narrative_signals_count',
    help: 'Number of narrative signals detected',
    labelNames: ['campaign_type'],
  });

  public agentActionSuccessRate = new Gauge({
    name: 'org_mesh_agent_action_success_rate',
    help: 'Success rate of agent actions',
    labelNames: ['agent_id'],
  });

  private constructor() {}

  public static getInstance(): OrgMeshMetrics {
    if (!OrgMeshMetrics.instance) {
      OrgMeshMetrics.instance = new OrgMeshMetrics();
    }
    return OrgMeshMetrics.instance;
  }

  public async traceOperation<T>(
    operationName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Basic tracing simulation if no SDK is active
    return this.tracer.startActiveSpan(operationName, async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error: any) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

export const metrics = OrgMeshMetrics.getInstance();
export { register };
