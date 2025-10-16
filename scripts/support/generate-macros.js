const fs = require('fs');
const cards = JSON.parse(
  fs.readFileSync('docs/ops/answers/cards.json', 'utf8'),
);
const macros = cards.slice(0, 50).map((c) => ({
  title: `IntelGraph: ${c.slug}`,
  body: `TL;DR: ${c.tldr}\nSteps:\n${(c.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\nSee: https://docs.intelgraph.example/${c.slug}`,
}));
fs.mkdirSync('docs/ops/support', { recursive: true });
fs.writeFileSync(
  'docs/ops/support/macros.json',
  JSON.stringify(macros, null, 2),
);
