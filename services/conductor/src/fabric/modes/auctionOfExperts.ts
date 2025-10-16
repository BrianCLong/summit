import { AoEBid, coverageScore } from '../registry';

export interface AuctionConstraints {
  costBudgetUsd: number;
  latencyBudgetMs: number;
  requiredSkills: string[];
  minConfidence?: number;
}

export interface AuctionResult {
  winners: AoEBid[];
  totalCost: number;
  totalLatency: number;
  coverage: number;
  rationale: string[];
}

export function runAuctionOfExperts(
  bids: AoEBid[],
  constraints: AuctionConstraints,
): AuctionResult {
  const eligible = bids.filter(
    (bid) => bid.confidence >= (constraints.minConfidence ?? 0.35),
  );
  const dominancePruned = pruneDominated(eligible);
  const best = selectBestBundle(dominancePruned, constraints);
  const coverage = coverageScore(
    best.map((b) => b.fitTags).flat(),
    constraints.requiredSkills,
  );
  return {
    winners: best,
    totalCost: sum(best.map((b) => b.est.costUSD)),
    totalLatency: Math.max(0, ...best.map((b) => b.est.latencyMs)),
    coverage,
    rationale: best.map((b) => b.rationale),
  };
}

function pruneDominated(bids: AoEBid[]): AoEBid[] {
  return bids.filter((bid) => {
    return !bids.some(
      (other) =>
        other !== bid &&
        other.est.costUSD <= bid.est.costUSD &&
        other.est.latencyMs <= bid.est.latencyMs &&
        other.est.quality >= bid.est.quality &&
        other.confidence >= bid.confidence &&
        other.fitTags.every((tag) => bid.fitTags.includes(tag)),
    );
  });
}

function selectBestBundle(
  bids: AoEBid[],
  constraints: AuctionConstraints,
): AoEBid[] {
  let best: { bundle: AoEBid[]; score: number } = { bundle: [], score: 0 };
  function helper(start: number, current: AoEBid[]): void {
    const cost = sum(current.map((b) => b.est.costUSD));
    const latency = Math.max(0, ...current.map((b) => b.est.latencyMs));
    if (
      cost > constraints.costBudgetUsd ||
      latency > constraints.latencyBudgetMs
    )
      return;
    const score = bundleValue(current);
    if (score > best.score) best = { bundle: [...current], score };
    for (let i = start; i < bids.length; i += 1) {
      current.push(bids[i]);
      helper(i + 1, current);
      current.pop();
    }
  }
  helper(0, []);
  return best.bundle.length ? best.bundle : bids.slice(0, 1);
}

function bundleValue(bundle: AoEBid[]): number {
  if (!bundle.length) return 0;
  const quality = sum(bundle.map((b) => b.est.quality * b.confidence));
  const cost = sum(bundle.map((b) => b.est.costUSD)) || 0.01;
  const latency = Math.max(1, ...bundle.map((b) => b.est.latencyMs));
  return quality / (cost * latency);
}

function sum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}
