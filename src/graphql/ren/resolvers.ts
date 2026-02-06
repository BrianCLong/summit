import { AttackerPlanner } from '../../agents/ren/deg/attacker_planner';
import { DefenderOptimizer } from '../../agents/ren/deg/defender_optimizer';
import { DEGSimulation } from '../../agents/ren/deg/equilibrium';

export const renResolvers = {
  Query: {
    renFindings: async (_: any, { tenantId }: { tenantId: string }) => {
      // Stub: return empty or mock
      return [];
    },
    renArtifacts: async (_: any, { tenantId }: { tenantId: string }) => {
      return [];
    }
  },
  Mutation: {
    runDegSimulation: async (_: any, { tenantId, scenarioId }: { tenantId: string, scenarioId?: string }) => {
      const attacker = new AttackerPlanner();
      const defender = new DefenderOptimizer();
      const sim = new DEGSimulation(attacker, defender);

      const result = await sim.run(tenantId, {});

      // Map DEGF to GraphQL schema
      return {
        id: result.finding_id,
        scenarioId: result.scenario_id,
        insights: result.reconstructed_insights.map(i => ({
          id: i.insight_id,
          sensitivity: i.sensitivity,
          description: i.description,
          supportingArtifacts: [] // Stub
        })),
        moves: result.recommended_moves.map(m => ({
          id: m.move_id,
          type: m.move_type,
          rationale: m.rationale,
          legalFriction: m.legal_friction_proxy
        })),
        score: result.intelligence_yield_score
      };
    }
  }
};
