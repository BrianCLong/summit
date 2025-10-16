const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const staleCut = 90; // days
function daysAgo(d) {
  return Math.floor((Date.now() - new Date(d || 0).getTime()) / 86400000);
}
const rows = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && score(p);
  }
})('docs');
function score(p) {
  const g = matter.read(p);
  const body = g.content;
  const hasSee = /##\s*See also/i.test(body);
  const hasNext = /##\s*Next steps/i.test(body);
  const hasImgAlt = /!\[[^\]]+\]\(/.test(body);
  const hasCode = /```/.test(body);
  const stale = Math.max(
    0,
    Math.min(1, daysAgo(g.data.lastUpdated) / staleCut),
  );
  const base =
    50 +
    (hasSee ? 10 : 0) +
    (hasNext ? 10 : 0) +
    (hasImgAlt ? 10 : 0) +
    (hasCode ? 10 : 0) -
    Math.round(stale * 20);
  rows.push({
    path: p.replace(/^docs\//, ''),
    score: Math.max(0, Math.min(100, base)),
  });
}
fs.mkdirSync('docs/ops/quality', { recursive: true });
fs.writeFileSync('docs/ops/quality/scores.json', JSON.stringify(rows, null, 2));
