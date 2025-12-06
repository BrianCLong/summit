import { describe, expect, it, beforeEach } from 'vitest';
import {
  OrchestrationKnowledgeGraph,
  type GraphSnapshot,
} from '../src/index.js';
import {
  loadGoldenIntelGraph,
  type GoldenGraphScenario,
} from '../../../../scripts/testing/load-golden-intelgraph.js';

describe('OrchestrationKnowledgeGraph', () => {
  let graph: OrchestrationKnowledgeGraph;
  let scenario: GoldenGraphScenario;
  let snapshot: GraphSnapshot;

  beforeEach(async () => {
    const loaded = await loadGoldenIntelGraph({ scenario: 'realistic-medium' });
    // Uses the realistic-medium scenario with hub-and-spoke services and prod incidents.
    graph = loaded.graph;
    scenario = loaded.scenario;
    snapshot = await graph.refresh();
  });

  it('builds nodes and relationships with risk scoring', async () => {
    const apiService = scenario.services.find((service) => service.id === 'svc-api');
    expect(apiService).toBeDefined();

    const pipelineId = scenario.pipelines[0]?.id;
    const stageId = scenario.pipelines[0]?.stages[0]?.id;
    expect(snapshot.nodes.find((node) => node.id === 'service:svc-api')).toBeDefined();
    expect(snapshot.nodes.find((node) => node.id === `pipeline:${pipelineId}`)).toBeDefined();
    expect(snapshot.edges.find((edge) => edge.id === `pipeline:${pipelineId}:CONTAINS:stage:${stageId}`)).toBeDefined();
    expect(
      snapshot.edges.find(
        (edge) => edge.id === `stage:${stageId}:TARGETS:service:${apiService?.id}`,
      ),
    ).toBeDefined();
    expect(
      snapshot.edges.find(
        (edge) => edge.id === 'incident:incident-api-latency:AFFECTS:service:svc-api',
      ),
    ).toBeDefined();

    const risk = snapshot.serviceRisk['svc-api'];
    expect(risk.score).toBeGreaterThan(0.3);
    expect(risk.factors.incidentLoad).toBeGreaterThan(risk.factors.costPressure * 0.5);
  });

  it('exposes service context view with incidents and policies', async () => {
    const context = graph.queryService('svc-api');
    expect(context?.service?.name).toBe('API');
    expect(context?.incidents).toHaveLength(2);
    expect(context?.policies?.[0]?.id).toBe('policy-hipaa-api');
    expect(context?.pipelines?.[0]?.id).toBe('pipeline-blue');
    expect(context?.risk?.score).toBeLessThanOrEqual(1);
  });

  it('returns undefined for unknown service', () => {
    expect(graph.queryService('unknown')).toBeUndefined();
  });
});
