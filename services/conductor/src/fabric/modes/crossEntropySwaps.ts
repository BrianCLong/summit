export interface Proposal {
  id: string;
  text: string;
  criticScores: number[];
}

export interface SwapResult {
  winner: Proposal;
  loser: Proposal;
  crossEntropy: number;
}

export function crossEntropySwap(a: Proposal, b: Proposal): SwapResult {
  const distA = normalize(a.criticScores);
  const distB = normalize(b.criticScores);
  const crossAB = crossEntropy(distA, distB);
  const crossBA = crossEntropy(distB, distA);
  if (crossAB <= crossBA) {
    return { winner: a, loser: b, crossEntropy: crossAB };
  }
  return { winner: b, loser: a, crossEntropy: crossBA };
}

function normalize(scores: number[]): number[] {
  const exp = scores.map((s) => Math.exp(s));
  const sum = exp.reduce((acc, val) => acc + val, 0) || 1;
  return exp.map((val) => val / sum);
}

function crossEntropy(p: number[], q: number[]): number {
  let sum = 0;
  for (let i = 0; i < p.length; i += 1) {
    const qi = q[i] ?? 1e-6;
    sum += -p[i] * Math.log(qi);
  }
  return sum;
}
