const fs = require('fs');
const path = require('path');
const base = 'https://docs.intelgraph.example';
function pages(dir) {
  const out = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f),
        s = fs.statSync(p);
      s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && out.push(p);
    }
  })(dir);
  return out.map((p) => '/' + p.replace(/^docs\//, '').replace(/\.mdx?$/, ''));
}
function xml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${base}${u}</loc></url>`).join('')}</urlset>`;
}
const urls = pages('docs');
fs.mkdirSync('docs-site/static', { recursive: true });
fs.writeFileSync('docs-site/static/sitemap.xml', xml(urls));
console.log('Sitemap URLs:', urls.length);
