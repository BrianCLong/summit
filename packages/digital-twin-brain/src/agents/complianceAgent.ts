import { Constraint, ActionProposal } from '../core/types.js';

export interface ComplianceReport {
  proposalId: string;
  passed: boolean;
  violations: Constraint[];
}

export class ComplianceAgent {
  constructor(private readonly constraints: Constraint[]) {}

  evaluate(proposal: ActionProposal): ComplianceReport {
    const violations = this.constraints.filter((constraint) => !constraint.predicate(proposal));
    return {
      proposalId: proposal.id,
      passed: violations.length === 0,
      violations,
    };
  }
}
