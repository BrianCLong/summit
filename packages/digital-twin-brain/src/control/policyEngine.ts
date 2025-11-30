import { v4 as uuidv4 } from 'uuid';
import { ActionProposal, Constraint, SimulationOutcome } from '../core/types.js';
import { SimulationSandbox } from './sandbox.js';

export interface PolicyEngineConfig {
  objectiveWeights: Record<string, number>;
  riskTolerance: number;
  constraints: Constraint[];
}

export class PolicyEngine {
  constructor(private readonly sandbox: SimulationSandbox, private readonly config: PolicyEngineConfig) {}

  rankCandidates(
    assetId: string,
    candidatePayloads: Record<string, unknown>[],
    state: Record<string, number>
  ): { proposal: ActionProposal; outcome: SimulationOutcome; constraintViolations: Constraint[] }[] {
    const baseProposals = candidatePayloads.map<ActionProposal>((payload) => ({
      id: uuidv4(),
      assetId,
      description: payload.description as string,
      objectiveScore: 0,
      riskScore: 0,
      payload,
    }));

    return baseProposals
      .map((proposal) => {
        const outcome = this.sandbox.evaluate(proposal, state);
        const objectiveScore = this.scoreObjectives(outcome.projectedKpis);
        const riskScore = outcome.uncertainty;
        const withScores: ActionProposal = { ...proposal, objectiveScore, riskScore };
        const violations = this.evaluateConstraints(withScores);
        return { proposal: withScores, outcome, constraintViolations: violations };
      })
      .filter(({ proposal, constraintViolations }) => proposal.riskScore <= this.config.riskTolerance || constraintViolations.length === 0)
      .sort((a, b) => b.proposal.objectiveScore - a.proposal.objectiveScore);
  }

  private scoreObjectives(projectedKpis: Record<string, number>): number {
    return Object.entries(this.config.objectiveWeights).reduce((score, [kpi, weight]) => {
      const value = projectedKpis[kpi] ?? 0;
      return score + value * weight;
    }, 0);
  }

  private evaluateConstraints(proposal: ActionProposal): Constraint[] {
    return this.config.constraints.filter((constraint) => !constraint.predicate(proposal));
  }
}
