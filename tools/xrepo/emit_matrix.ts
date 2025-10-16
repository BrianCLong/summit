import fs from 'fs';
const g = JSON.parse(
  JSON.stringify(
    require('js-yaml').load(fs.readFileSync('.maestro/xrepo.yaml', 'utf8')),
  ),
).graph;
function topo(g: any) {
  const indeg: any = {},
    adj: any = {};
  Object.keys(g).forEach((k) => {
    indeg[k] = indeg[k] || 0;
    g[k].forEach((d: string) => {
      (adj[d] = adj[d] || []).push(k);
      indeg[k] = (indeg[k] || 0) + 1;
    });
  });
  const q = Object.keys(indeg).filter((k) => !indeg[k]);
  const out: any = [];
  while (q.length) {
    const u = q.shift()!;
    out.push(u);
    (adj[u] || []).forEach((v: string) => {
      if (--indeg[v] === 0) q.push(v);
    });
  }
  return out;
}
const order = topo(g);
const include = order.map((repo: string) => ({
  repo,
  ref: 'candidate',
  tasks: ['build', 'test'],
}));
process.stdout.write(JSON.stringify({ include }));
