import { describe, it, expect } from 'vitest';
import { CIESimulator } from '../../src/agents/cis/game/equilibrium';
import { InterventionOptimizer } from '../../src/graphrag/cis/interventions/optimizer';
import { CIGSnapshot } from '../../src/graphrag/cis/cig/builder';
import { PIEVector } from '../../src/graphrag/cis/pie/vector';

describe('CIE Equilibrium & Interventions', () => {
  it('should propagate risk and recommend interventions', () => {
    // Setup CIG
    const cig: CIGSnapshot = {
      nodes: [
        { id: 'n1', type: 'Narrative', properties: { risk_score: 0.5 } },
        { id: 'actor-bad', type: 'Actor', properties: { name: 'bad' } }
      ],
      edges: [
        { source: 'actor-bad', target: 'n1', type: 'PROMOTES', weight: 0.5 }
      ],
      timestamp: new Date().toISOString()
    };

    // Setup PIE (Low integrity actor)
    const pie: PIEVector[] = [
      {
        entity_id: 'bad', // matches name in actor-bad
        integrity_score: 0.1, // very low integrity
        manipulation_risk: 0.9,
        ai_content_ratio: 0.5,
        signal_count: 10
      }
    ];

    // Run Simulation
    const simulator = new CIESimulator();
    const state = simulator.run(cig, pie);

    // Initial risk 0.5 + Amplification ((1-0.1)*0.5 = 0.45) = 0.95
    expect(state.risk_distribution['n1']).toBeCloseTo(0.95);

    // Optimize Interventions
    const optimizer = new InterventionOptimizer();
    const bundles = optimizer.recommend(state);

    expect(bundles).toHaveLength(1);
    expect(bundles[0].type).toBe('DEAMPLIFY');
    expect(bundles[0].priority).toBe('HIGH');
  });
});
