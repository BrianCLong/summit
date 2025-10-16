const fs = require('fs');
function safe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return [];
  }
}
const tta = safe('docs/ops/tta/summary.json');
// Placeholder: in production, aggregate per query; here, output simple boosts for high‑success pages
const rules = [
  {
    objectID: 'boost-zip',
    condition: { context: 'query', pattern: 'zip|cert' },
    consequence: { promote: [{ objectID: '/how-to/zip-export', position: 1 }] },
  },
  {
    objectID: 'boost-upgrade',
    condition: { context: 'query', pattern: 'upgrade|v24' },
    consequence: {
      promote: [{ objectID: '/how-to/upgrade-to-v24', position: 1 }],
    },
  },
];
fs.mkdirSync('docs/ops/search', { recursive: true });
fs.writeFileSync(
  'docs/ops/search/algolia.rules.json',
  JSON.stringify(rules, null, 2),
);
console.log('Wrote rules');
