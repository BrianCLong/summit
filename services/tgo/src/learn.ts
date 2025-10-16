type Obs = {
  path: string;
  secs: number;
  size: number;
  flake: boolean;
  hot: boolean;
};
const alpha = 0.2;
const model: Record<string, { w: number; last: number }> = {};
export function update(o: Obs) {
  const f = feat(o);
  const m = model[o.path] || { w: 1, last: o.secs };
  m.w = (1 - alpha) * m.w + alpha * (o.secs / (1 + f));
  m.last = o.secs;
  model[o.path] = m;
}
export function eta(path: string) {
  const f = feat({
    path,
    secs: 0,
    size: sz(path),
    flake: false,
    hot: isHot(path),
  });
  const m = model[path];
  return Math.max(2, (m ? m.w : 10) * (1 + f));
}
const sz = (p: string) => Math.min(10, Math.ceil((p.length % 200) / 20));
const isHot = (p: string) => /server\/src\/(scheduler|steps)/.test(p);
const feat = (o: Partial<Obs>) =>
  0.1 * (o.size || 1) + (o.hot ? 0.3 : 0) + 0.2 * (o.flake ? 1 : 0);
