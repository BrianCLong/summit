const fs = require('fs');
const yaml = require('js-yaml');
const base = 'https://docs.intelgraph.example';
const s = yaml.load(fs.readFileSync('docs/_meta/sunset.yml', 'utf8'));
const urls = [];
for (const v of s.versions) {
  // naive: list common top-level paths per version; adapt to your routing
  urls.push(`${base}/docs/${v.id}/`);
}
const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${u}</loc><lastmod>${new Date().toISOString()}</lastmod></url>`).join('')}</urlset>`;
fs.mkdirSync('docs-site/static', { recursive: true });
fs.writeFileSync('docs-site/static/sunset-sitemap.xml', xml);
