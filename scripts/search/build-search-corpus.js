const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
function extract(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let current = { h: 'h1', text: '' };
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)/.exec(line);
    if (m) {
      if (current.text) out.push(current);
      current = { h: 'h' + m[1].length, text: m[2] };
    } else current.text += ' ' + line.replace(/`[^`]+`/g, '');
  }
  if (current.text) out.push(current);
  return out;
}
const docs = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && docs.push(p);
  }
})('docs');
const rows = docs.map((p) => {
  const raw = fs.readFileSync(p, 'utf8');
  const g = matter(raw);
  const slug = p.replace(/^docs\//, '').replace(/\.mdx?$/, '');
  const sections = extract(g.content);
  return {
    id: slug,
    path: '/' + slug,
    title: g.data.title || slug,
    summary: g.data.summary || '',
    version: g.data.version || 'latest',
    tags: g.data.tags || [],
    sections,
  };
});
fs.mkdirSync('docs/ops/search', { recursive: true });
fs.writeFileSync('docs/ops/search/corpus.json', JSON.stringify(rows, null, 2));
console.log('Search corpus:', rows.length);
