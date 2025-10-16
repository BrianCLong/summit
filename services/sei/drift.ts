export function psi(p: number[], q: number[]) {
  return (
    0.5 *
    (p.reduce((s, pi, i) => s + pi * Math.log(pi / q[i]), 0) +
      q.reduce((s, qi, i) => s + qi * Math.log(qi / p[i]), 0))
  );
}
