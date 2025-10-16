export type Episode = {
  x: number[];
  a: number;
  eval: number;
  cost: number;
  risk: number;
  p_beh: number;
};
export function step(
  theta: number[][],
  episodes: Episode[],
  lambdaCost = 1.0,
  lambdaEval = 1.0,
  lr = 1e-2,
) {
  // softmax policy over arms
  const grad = theta.map((r) => r.map(() => 0));
  for (const e of episodes) {
    const logits = theta.map((w) => w.reduce((s, wi, i) => s + wi * e.x[i], 0));
    const Z = logits.map(Math.exp).reduce((a, b) => a + b, 0);
    const pi = logits.map((v) => Math.exp(v) / Z);
    const r = e.eval - 0.5 * e.cost - 0.2 * e.risk; // shaped reward
    const cC = Math.max(0, e.cost - 0.9); // cost constraint slack
    const cE = Math.max(0, 0.92 - e.eval); // eval floor slack
    const adv = r - (lambdaCost * cC + lambdaEval * cE);
    for (let a = 0; a < theta.length; a++) {
      const coeff = (a === e.a ? 1 - pi[a] : -pi[a]) * adv;
      for (let i = 0; i < theta[a].length; i++) grad[a][i] += coeff * e.x[i];
    }
  }
  for (let a = 0; a < theta.length; a++)
    for (let i = 0; i < theta[a].length; i++) theta[a][i] += lr * grad[a][i];
  return theta;
}
