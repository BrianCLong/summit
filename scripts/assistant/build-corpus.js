const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const removeMd = (s) =>
  s.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '');
const docsDir = 'docs';
const out = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const raw = fs.readFileSync(p, 'utf8');
      const g = matter(raw);
      out.push({
        id: p.replace(/^docs\//, ''),
        title: g.data.title || path.basename(p),
        summary: g.data.summary || '',
        version: g.data.version || 'latest',
        owner: g.data.owner || 'unknown',
        tags: g.data.tags || [],
        body: removeMd(g.content),
      });
    }
  }
})(docsDir);
fs.mkdirSync('docs/ops/assistant', { recursive: true });
fs.writeFileSync(
  'docs/ops/assistant/corpus.json',
  JSON.stringify(out, null, 2),
);
console.log('Corpus size', out.length);
