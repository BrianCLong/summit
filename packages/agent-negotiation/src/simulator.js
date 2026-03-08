"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationSimulator = void 0;
class NegotiationSimulator {
    agents;
    constructor(agents) {
        this.agents = agents;
    }
    negotiate(proposal) {
        console.log(`Starting negotiation for proposal: ${proposal.action} by ${proposal.proposerId}`);
        let rounds = 0;
        const evaluations = [];
        let approved = true;
        // In a real system, this would be an iterative loop of counter-offers.
        // Here we simulate a single round of voting (Nash equilibrium convergence check would be more complex).
        rounds++;
        for (const agent of this.agents) {
            if (agent.id === proposal.proposerId)
                continue; // Proposer implicitly approves
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
exports.NegotiationSimulator = NegotiationSimulator;
