
export interface ConsensusResult {
  approved: boolean;
  votes: { agent: string; vote: 'YES' | 'NO'; reason: string }[];
  finalDecision: string;
}

export class CouncilService {
  private static instance: CouncilService;

  private constructor() {}

  public static getInstance(): CouncilService {
    if (!CouncilService.instance) {
      CouncilService.instance = new CouncilService();
    }
    return CouncilService.instance;
  }

  public async requestConsensus(proposal: string): Promise<ConsensusResult> {
    const agents = [
      { name: 'SecurityAgent', bias: 'paranoid' },
      { name: 'PrivacyAgent', bias: 'conservative' },
      { name: 'UtilityAgent', bias: 'optimistic' }
    ];

    const votes = agents.map(agent => {
      let vote: 'YES' | 'NO' = 'YES';
      let reason = 'Looks good.';

      if (agent.name === 'SecurityAgent' && proposal.includes('root')) {
        vote = 'NO';
        reason = 'Root access requested.';
      }
      if (agent.name === 'PrivacyAgent' && proposal.includes('email')) {
        vote = 'NO';
        reason = 'PII detected.';
      }

      return { agent: agent.name, vote, reason };
    });

    const yesVotes = votes.filter(v => v.vote === 'YES').length;
    const approved = yesVotes >= 2;

    return {
      approved,
      votes,
      finalDecision: approved ? 'PROCEED' : 'HALT'
    };
  }
}
