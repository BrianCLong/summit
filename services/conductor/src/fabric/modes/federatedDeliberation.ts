export interface RegionalVote {
  region: string;
  proposalId: string;
  score: number;
  weight: number;
}

export interface QuorumResult {
  winningProposalId: string;
  support: number;
  breakdown: { region: string; weight: number; score: number }[];
}

export function federatedConsensus(
  votes: RegionalVote[],
  quorum: number,
): QuorumResult {
  const support = new Map<string, number>();
  for (const vote of votes) {
    support.set(
      vote.proposalId,
      (support.get(vote.proposalId) || 0) + vote.weight * vote.score,
    );
  }
  const [winningProposalId, winningSupport] = [...support.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0] || ['none', 0];
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
