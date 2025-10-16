export type Trust = { a: number; b: number }; // Beta(a,b)
export function update(tr: Trust, ok: boolean): Trust {
  return { a: tr.a + (ok ? 1 : 0), b: tr.b + (ok ? 0 : 1) };
}
export function mean(tr: Trust) {
  return tr.a / (tr.a + tr.b);
}
