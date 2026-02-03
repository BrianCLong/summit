import { NegotiationSimulator, Agent, Proposal } from '../../packages/agent-negotiation/src/simulator.ts';

// Verification script for Agent Negotiation
// Simulates a negotiation between Infra, Reliability, and FinOps agents.

const infraAgent: Agent = {
    id: 'infra-agent-01',
    role: 'infrastructure',
    evaluate: (proposal) => ({ agentId: 'infra-agent-01', score: 10, approved: true, reason: 'Self-proposal' })
};

const reliabilityAgent: Agent = {
    id: 'reliability-agent-01',
    role: 'reliability',
    evaluate: (proposal) => {
        // Reliability likes scaling up (stability), dislikes scaling down if load is high
        if (proposal.action === 'scale_up') {
             return { agentId: 'reliability-agent-01', score: 8, approved: true, reason: 'Improves stability' };
        } else if (proposal.action === 'scale_down') {
             // Mock check
             return { agentId: 'reliability-agent-01', score: -5, approved: false, reason: 'Risk of downtime' };
        }
        return { agentId: 'reliability-agent-01', score: 0, approved: true, reason: 'Neutral' };
    }
};

const finopsAgent: Agent = {
    id: 'finops-agent-01',
    role: 'finops',
    evaluate: (proposal) => {
        // FinOps dislikes cost increases
        if (proposal.action === 'scale_up') {
             const cost = proposal.parameters.costEstimate || 0;
             if (cost > 50) {
                 return { agentId: 'finops-agent-01', score: -10, approved: false, reason: 'Cost exceeds budget' };
             }
             return { agentId: 'finops-agent-01', score: -2, approved: true, reason: 'Acceptable cost increase' };
        }
        return { agentId: 'finops-agent-01', score: 5, approved: true, reason: 'Saves money' };
    }
};

try {
    const simulator = new NegotiationSimulator([infraAgent, reliabilityAgent, finopsAgent]);

    console.log("--- Scenario 1: Moderate Scale Up ---");
    const proposal1: Proposal = {
        id: 'prop-1',
        action: 'scale_up',
        parameters: { costEstimate: 20 },
        proposerId: 'infra-agent-01'
    };

    const result1 = simulator.negotiate(proposal1);
    if (!result1.approved) throw new Error("Scenario 1 should have been approved");
    console.log("Scenario 1 passed (Approved).");

    console.log("--- Scenario 2: Expensive Scale Up ---");
    const proposal2: Proposal = {
        id: 'prop-2',
        action: 'scale_up',
        parameters: { costEstimate: 100 },
        proposerId: 'infra-agent-01'
    };

    const result2 = simulator.negotiate(proposal2);
    if (result2.approved) throw new Error("Scenario 2 should have been rejected by FinOps");
    console.log("Scenario 2 passed (Rejected correctly).");

    console.log("✅ Agent Negotiation Verification Passed!");

} catch (error) {
    console.error("❌ Verification Failed:", error);
    process.exit(1);
}
