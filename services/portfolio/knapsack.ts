export type Item = {
  id: string;
  value: number;
  costUSD: number;
  ciMins: number;
};
export function plan(items: Item[], budgets: { usd: number; ci: number }) {
  // simple greedy by value density across two budgets, then local refine
  const s = items
    .map((x) => ({ x, d: x.value / (x.costUSD + 0.01 + x.ciMins / 30) }))
    .sort((a, b) => b.d - a.d);
  const pick: Item[] = [];
  let usd = 0,
    ci = 0;
  for (const { x } of s) {
    if (usd + x.costUSD <= budgets.usd && ci + x.ciMins <= budgets.ci) {
      pick.push(x);
      usd += x.costUSD;
      ci += x.ciMins;
    }
  }
  return { pick, usd, ci };
}
