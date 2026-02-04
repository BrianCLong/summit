export interface Agent {
  id: string;
  role: string;
  evaluate: (proposal: Proposal) => Evaluation;
}

export interface Proposal {
  id: string;
  action: string;
  parameters: Record<string, any>;
  proposerId: string;
}

export interface Evaluation {
  agentId: string;
  score: number;
  approved: boolean;
  reason: string;
}

export class NegotiationSimulator {
  private agents: Agent[];

  constructor(agents: Agent[]) {
    this.agents = agents;
  }

  public negotiate(proposal: Proposal): { approved: boolean; rounds: number; evaluations: Evaluation[] } {
    console.log(`Starting negotiation for proposal: ${proposal.action} by ${proposal.proposerId}`);

    let rounds = 0;
    const evaluations: Evaluation[] = [];
    let approved = true;

    // In a real system, this would be an iterative loop of counter-offers.
    // Here we simulate a single round of voting (Nash equilibrium convergence check would be more complex).

    rounds++;
    for (const agent of this.agents) {
      if (agent.id === proposal.proposerId) continue; // Proposer implicitly approves

      const evaluation = agent.evaluate(proposal);
      evaluations.push(evaluation);

      console.log(`Agent ${agent.id} evaluated: ${evaluation.approved ? 'APPROVED' : 'REJECTED'} (${evaluation.score}) - ${evaluation.reason}`);

      if (!evaluation.approved) {
        approved = false;
      }
    }

    return { approved, rounds, evaluations };
  }
}
