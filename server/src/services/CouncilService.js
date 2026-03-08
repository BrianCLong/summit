"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouncilService = void 0;
class CouncilService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!CouncilService.instance) {
            CouncilService.instance = new CouncilService();
        }
        return CouncilService.instance;
    }
    async requestConsensus(proposal) {
        const agents = [
            { name: 'SecurityAgent', bias: 'paranoid' },
            { name: 'PrivacyAgent', bias: 'conservative' },
            { name: 'UtilityAgent', bias: 'optimistic' }
        ];
        const votes = agents.map(agent => {
            let vote = 'YES';
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
exports.CouncilService = CouncilService;
