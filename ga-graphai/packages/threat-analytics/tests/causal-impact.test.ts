import { describe, expect, it } from 'vitest';
import { CausalImpactEstimator } from '../src/causal-impact';
import type { CascadeGraph } from '../src/types';

describe('CausalImpactEstimator', () => {
  it('estimates reach and shape deltas after removing an actor', () => {
    const cascade: CascadeGraph = {
      nodes: [
        { id: 'n1', actorId: 'actor-a', reach: 100 },
        { id: 'n2', actorId: 'actor-b', reach: 50 },
        { id: 'n3', actorId: 'actor-c', reach: 30 },
        { id: 'n4', actorId: 'actor-d', reach: 20 },
      ],
      edges: [
        { source: 'n1', target: 'n2' },
        { source: 'n2', target: 'n3' },
        { source: 'n1', target: 'n4' },
      ],
    };

    const estimator = new CausalImpactEstimator();
    const result = estimator.estimateActorRemovalImpact(cascade, ['actor-b']);

    expect(result.removedNodeIds).toEqual(['n2']);
    expect(result.affectedNodeIds.sort()).toEqual(['n2', 'n3']);
    expect(result.baselineReach).toBe(200);
    expect(result.counterfactualReach).toBe(120);
    expect(result.reachDelta).toBe(80);
    expect(result.baselineDepth).toBe(2);
    expect(result.counterfactualDepth).toBe(1);
  });
});
