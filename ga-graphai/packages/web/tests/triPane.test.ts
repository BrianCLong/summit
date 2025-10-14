import { describe, expect, it, vi } from 'vitest';
import { TriPaneController, type EvidenceNode } from '../src/index.js';

vi.mock('policy', () => ({
  computeWorkflowEstimates: () => ({ criticalPath: [], totalLatencyMs: 0, totalCostUSD: 0 }),
  topologicalSort: (workflow: { nodes: Array<{ id: string }> }) => ({ order: workflow.nodes.map(node => node.id) }),
  validateWorkflow: (workflow: unknown) => ({
    normalized: workflow,
    analysis: {
      estimated: { criticalPath: [] }
    },
    warnings: []
  })
}));

const evidence: EvidenceNode[] = [
  { id: 'ev-1', label: 'email:alice@example.com', confidence: 0.9, policies: ['policy:export'] },
  { id: 'ev-2', label: 'geo:berlin', confidence: 0.8, policies: ['policy:retention'] },
  { id: 'ev-3', label: 'case:orion-breach', confidence: 0.85, policies: ['policy:export'] }
];

describe('TriPaneController', () => {
  it('synchronizes selections across panels', () => {
    const controller = new TriPaneController();
    let mapUpdates = 0;
    controller.on('map', state => {
      mapUpdates += 1;
      expect(state.mapSelection).toBe('ev-1');
    });
    controller.selectFromGraph('person-1', evidence);
    expect(controller.current.timelineSelection).toBe('ev-3');
    expect(controller.current.policyBindings.sort()).toEqual(['policy:export', 'policy:retention'].sort());
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
});
