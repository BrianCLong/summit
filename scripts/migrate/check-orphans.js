const fs = require('fs');
const map = JSON.parse(fs.readFileSync('docs/ops/meta/redirects.json', 'utf8'));
let fail = 0;
for (const r of map) {
  const target = `docs${r.to.endsWith('.md') ? '' : r.to}.md`;
  if (!fs.existsSync(target) && !fs.existsSync(target + '.mdx')) {
    console.error('Redirect target missing:', r.to);
    fail = 1;
  }
}
process.exit(fail);
