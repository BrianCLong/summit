const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 120; // 120 days
const out = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/.mdx?$/.test(f)) {
      const { data } = matter.read(p);
      const d = new Date(data.lastUpdated || 0).getTime();
      if (!d || d < cutoff)
        out.push({
          file: p,
          owner: data.owner || 'unknown',
          lastUpdated: data.lastUpdated || 'n/a',
        });
    }
  }
}
walk('docs');
fs.writeFileSync('docs-stale-report.json', JSON.stringify(out, null, 2));
console.log(`Found ${out.length} potentially stale docs`);
