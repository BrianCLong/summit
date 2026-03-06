import { DEGSimulation } from '../../src/agents/ren/deg/equilibrium';
import { AttackerPlanner } from '../../src/agents/ren/deg/attacker_planner';
import { DefenderOptimizer } from '../../src/agents/ren/deg/defender_optimizer';

describe('DEG Simulation', () => {
  it('should run simulation and produce DEGF', async () => {
    const attacker = new AttackerPlanner();
    const defender = new DefenderOptimizer();
    const sim = new DEGSimulation(attacker, defender);

    const result = await sim.run('tenant-123', {});

    expect(result.tenant_id).toBe('tenant-123');
    expect(result.reconstructed_insights.length).toBeGreaterThan(0);
    expect(result.recommended_moves.length).toBeGreaterThan(0);
  });
});
