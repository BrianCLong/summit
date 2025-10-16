const fs = require('fs');
const nodes = Array.from({ length: 100 }, (_, i) => ({
  id: `n${i}`,
  label: 'Person',
}));
const edges = Array.from({ length: 200 }, (_, i) => ({
  from: `n${i % 100}`,
  to: `n${(i * 7) % 100}`,
  rel: 'KNOWS',
}));
fs.writeFileSync(
  'fixtures/case-demo/demo.graph.json',
  JSON.stringify({ nodes, edges }, null, 2),
);
console.log('Seed graph written.');
