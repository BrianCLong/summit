const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const now = Date.now();
const rows = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && rows.push(p);
  }
})('docs');
const out = rows.map((p) => {
  const g = matter.read(p);
  const days = Math.max(
    1,
    (now - new Date(g.data.lastUpdated || 0).getTime()) / (1000 * 60 * 60 * 24),
  );
  const score = Math.min(1, days / 180);
  return { path: p, days, score: Number(score.toFixed(2)) };
});
fs.writeFileSync(
  'docs/ops/decay-report.json',
  JSON.stringify(
    out.sort((a, b) => b.score - a.score),
    null,
    2,
  ),
);
