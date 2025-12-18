import { PolicyEngine } from '../control/policyEngine.js';
import { SimulationSandbox } from '../control/sandbox.js';
import { ActionProposal, Constraint } from '../core/types.js';

export interface OptimizationResult {
  proposal: ActionProposal;
  violations: Constraint[];
}

export class OptimizationAgent {
  constructor(private readonly policyEngine: PolicyEngine, private readonly sandbox: SimulationSandbox) {}

  search(
    assetId: string,
    candidatePayloads: Record<string, unknown>[],
    state: Record<string, number>
  ): OptimizationResult[] {
    return this.policyEngine.rankCandidates(assetId, candidatePayloads, state).map(({ proposal, constraintViolations }) => ({
      proposal,
      violations: constraintViolations,
    }));
  }
}
