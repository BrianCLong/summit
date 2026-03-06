import { AttackerPlanner } from './attacker_planner';
import { DefenderOptimizer } from './defender_optimizer';
import { DEGF } from '../../../graphrag/ren/ecf';

export class DEGSimulation {
  constructor(
    private attacker: AttackerPlanner,
    private defender: DefenderOptimizer
  ) {}

  public async run(tenantId: string, rdgSnapshot: any): Promise<DEGF> {
    const insights = await this.attacker.planAttack(rdgSnapshot);
    const moves = await this.defender.optimizeDefense(insights);

    return {
      tenant_id: tenantId,
      finding_id: `deg-${Date.now()}`,
      scenario_id: 'default-scenario',
      reconstructed_insights: insights,
      intelligence_yield_score: 80, // Stub score
      recommended_moves: moves,
      evidence_refs: [] // Should link to evidence
    };
  }
}
