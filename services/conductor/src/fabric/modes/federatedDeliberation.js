"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.federatedConsensus = federatedConsensus;
function federatedConsensus(votes, quorum) {
    const support = new Map();
    for (const vote of votes) {
        support.set(vote.proposalId, (support.get(vote.proposalId) || 0) + vote.weight * vote.score);
    }
    const [winningProposalId, winningSupport] = [...support.entries()].sort((a, b) => b[1] - a[1])[0] || ['none', 0];
    const denominator = quorum > 0 ? quorum : 1;
    const normalizedSupport = winningSupport / denominator;
    return {
        winningProposalId,
        support: Number(Math.min(1, normalizedSupport).toFixed(3)),
        breakdown: votes
            .filter((vote) => vote.proposalId === winningProposalId)
            .map((vote) => ({
            region: vote.region,
            weight: vote.weight,
            score: vote.score,
        })),
    };
}
