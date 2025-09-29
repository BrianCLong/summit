export type RepInputs = {
  proofsOk: number;
  proofsTotal: number;
  violations30d: number;
  refunds30d: number;
  ageDays: number;
};

export function scorePublisher(x: RepInputs) {
  const passRate = x.proofsTotal ? x.proofsOk / x.proofsTotal : 1;
  const penalty = 0.3 * x.violations30d + 0.2 * x.refunds30d;
  const ageBoost = Math.min(0.1, (x.ageDays / 365) * 0.1);
  return Math.max(0, Math.min(1, passRate - penalty + ageBoost));
}
