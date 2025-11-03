import { describe, expect, it, vi } from 'vitest';
import {
  TriPaneController,
  type EvidenceNode,
  type NarrativeTelemetry,
} from '../src/index.js';

vi.mock('policy', () => ({
  computeWorkflowEstimates: () => ({
    criticalPath: [],
    totalLatencyMs: 0,
    totalCostUSD: 0,
  }),
  topologicalSort: (workflow: { nodes: Array<{ id: string }> }) => ({
    order: workflow.nodes.map((node) => node.id),
  }),
  validateWorkflow: (workflow: unknown) => ({
    normalized: workflow,
    analysis: {
      estimated: { criticalPath: [] },
    },
    warnings: [],
  }),
}));

const evidence: EvidenceNode[] = [
  {
    id: 'ev-1',
    label: 'email:alice@example.com',
    confidence: 0.9,
    policies: ['policy:export'],
  },
  {
    id: 'ev-2',
    label: 'geo:berlin',
    confidence: 0.8,
    policies: ['policy:retention'],
  },
  {
    id: 'ev-3',
    label: 'case:orion-breach',
    confidence: 0.85,
    policies: ['policy:export'],
  },
];

describe('TriPaneController', () => {
  it('synchronizes selections across panels', () => {
    const controller = new TriPaneController();
    let mapUpdates = 0;
    controller.on('map', (state) => {
      mapUpdates += 1;
      expect(state.mapSelection).toBe('ev-1');
    });
    controller.selectFromGraph('person-1', evidence);
    expect(controller.current.timelineSelection).toBe('ev-3');
    expect(controller.current.policyBindings.sort()).toEqual(
      ['policy:export', 'policy:retention'].sort(),
    );
    expect(controller.current.confidenceOpacity).toBeLessThanOrEqual(1);
    expect(mapUpdates).toBeGreaterThan(0);
  });

  it('saves and restores views with explain output', () => {
    const controller = new TriPaneController(evidence);
    controller.selectFromGraph('person-1', evidence);
    controller.saveView('orion');
    controller.selectFromGraph('person-2', [evidence[1]]);
    const restored = controller.restoreView('orion');
    expect(restored?.graphSelection).toBe('person-1');
    const explain = controller.explainCurrentView();
    expect(explain.focus).toBe('person-1');
    expect(explain.evidence.length).toBe(3);
  });

  it('tracks time-to-path metric', () => {
    const controller = new TriPaneController();
    controller.recordPathDiscovery(1200);
    controller.recordPathDiscovery(800);
    expect(controller.averageTimeToPath()).toBe(1000);
  });

  it('aggregates narrative telemetry and exposes diagnostics', () => {
    const controller = new TriPaneController();
    const telemetry: NarrativeTelemetry[] = [
      {
        identification: 0.8,
        imitation: 0.6,
        amplification: 0.7,
        emotionalSignals: { fear: 0.4, hope: 0.2 },
      },
      {
        identification: 0.7,
        imitation: 0.65,
        amplification: 0.75,
        emotionalSignals: { anger: 0.3, uncertainty: 0.2 },
      },
    ];

    const diagnostics = controller.ingestNarrativeTelemetry(telemetry);
    expect(diagnostics.identification).toBeGreaterThan(0.7);
    expect(diagnostics.emotionalRisk).toBeGreaterThan(0);
    expect(controller.getNarrativeDiagnostics()).toEqual(diagnostics);
  });
});
