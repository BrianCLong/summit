const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && pages.push(p);
  }
})('docs');
const out = [];
for (const p of pages) {
  const g = matter.read(p);
  const body = g.content;
  const tldr =
    (body.match(/>\s*\*\*TL;DR:\*\*\s*(.+)/i) || [])[1] ||
    body
      .split(/\n{2,}/)[0]
      .replace(/\n/g, ' ')
      .slice(0, 240);
  const steps = (body.match(/##\s*Steps[\s\S]*?(?:\n##|$)/i) || [''])[0]
    .split(/\n\d+\.\s+/)
    .slice(1)
    .map((s) => s.trim())
    .slice(0, 6);
  const facts = Array.from(body.matchAll(/-\s*\*\*(.+?)\*\*:?\s*(.+)/g))
    .map((m) => `${m[1]} — ${m[2]}`)
    .slice(0, 6);
  out.push({
    slug: p.replace(/^docs\//, '').replace(/\.mdx?$/, ''),
    tldr,
    steps,
    facts,
  });
}
fs.mkdirSync('docs/ops/answers', { recursive: true });
fs.writeFileSync('docs/ops/answers/cards.json', JSON.stringify(out, null, 2));
console.log('Answer cards:', out.length);
