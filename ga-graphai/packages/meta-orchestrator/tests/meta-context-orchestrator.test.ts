import { beforeEach, describe, expect, it } from 'vitest';
import {
  MetaContextOrchestrator,
  type ContextAssemblyRequest,
  type ContextNode,
} from '../src/index.js';

function buildNode(
  overrides: Partial<ContextNode> & Pick<ContextNode, 'kind' | 'layer'>,
): Omit<ContextNode, 'id'> {
  return {
    kind: overrides.kind,
    layer: overrides.layer,
    affordances: overrides.affordances ?? ['describable'],
    data: overrides.data ?? { note: 'test' },
    provenance:
      overrides.provenance ??
      ({
        source: 'test-suite',
        timestamp: new Date().toISOString(),
      } as ContextNode['provenance']),
    tags: overrides.tags,
    title: overrides.title,
    invariants: overrides.invariants,
    supersedes: overrides.supersedes,
    supersededBy: overrides.supersededBy,
  };
}

describe('MetaContextOrchestrator', () => {
  let orchestrator: MetaContextOrchestrator;

  beforeEach(() => {
    orchestrator = new MetaContextOrchestrator();
  });

  it('supersedes prior nodes when registering updates and assembles active context', () => {
    orchestrator.registerNode({ ...buildNode({ kind: 'decision', layer: 'task' }), id: 'n1' });
    orchestrator.registerNode({
      ...buildNode({ kind: 'decision', layer: 'task', title: 'Updated', supersedes: ['n1'] }),
      id: 'n2',
    });

    const packet = orchestrator.assemble({ goal: 'test-plan' });
    const nodeIds = packet.nodes.map((node) => node.id);

    expect(nodeIds).toContain('n2');
    expect(nodeIds).not.toContain('n1');
  });

  it('enforces strict contracts, blocking forbidden tags and ensuring required kinds', () => {
    orchestrator.registerNode({
      ...buildNode({ kind: 'decision', layer: 'task', tags: ['reviewed'] }),
      id: 'decision-1',
    });
    orchestrator.registerNode({
      ...buildNode({ kind: 'note', layer: 'task', tags: ['secret'] }),
      id: 'note-1',
    });

    const contract = {
      requiredKinds: ['decision'],
      forbiddenTags: ['secret'],
      layerAllowlist: ['task', 'world'] as ContextAssemblyRequest['includeLayers'],
    };

    expect(() =>
      orchestrator.assemble({ goal: 'guardrails', contract, strict: true }),
    ).toThrowError(/forbidden tags/);
  });

  it('filters by affordances and includeKinds to produce minimal packets', () => {
    orchestrator.registerNode({
      ...buildNode({ kind: 'summary', layer: 'world', affordances: ['describable'] }),
      id: 'summary-1',
    });
    orchestrator.registerNode({
      ...buildNode({
        kind: 'summary',
        layer: 'world',
        affordances: ['describable', 'runnable'],
      }),
      id: 'summary-2',
    });

    const packet = orchestrator.assemble({
      goal: 'run-experiment',
      includeKinds: ['summary'],
      requiredAffordances: ['runnable'],
    });

    expect(packet.nodes).toHaveLength(1);
    expect(packet.nodes[0].id).toBe('summary-2');
  });

  it('records standalone deltas and exposes them in assembled packets', () => {
    const delta = orchestrator.recordDelta({
      kind: 'decision',
      summary: 'selected architecture',
      author: 'tester',
      linkedNodeIds: [],
    });

    orchestrator.registerNode({ ...buildNode({ kind: 'fact', layer: 'world' }), id: 'fact-1' });
    const packet = orchestrator.assemble({ goal: 'traceability' });

    expect(packet.deltas.some((entry) => entry.id === delta.id)).toBe(true);
    expect(packet.deltas.length).toBeGreaterThanOrEqual(1);
  });
});
