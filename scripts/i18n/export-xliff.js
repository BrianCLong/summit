const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const strip = (s) => s.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '');
const entries = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && entries.push(p);
  }
})('docs');
let body = `<?xml version="1.0"?><xliff version="1.2"><file source-language="en" datatype="plaintext"><body>`;
entries.forEach((p) => {
  const g = matter.read(p);
  const id = p.replace(/^docs\//, '');
  body += `<trans-unit id="${id}"><source>${(g.content ? strip(g.content) : '').substring(0, 5000).replace(/&/g, '&amp;')}</source></trans-unit>`;
});
body += `</body></file></xliff>`;
fs.mkdirSync('i18n/export', { recursive: true });
fs.writeFileSync('i18n/export/docs-en.xliff', body);
