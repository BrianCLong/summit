const fs = require('fs');
const path = 'docs/ops/experiments/hero.json';
let state = { A: { a: 1, b: 1 }, B: { a: 1, b: 1 } };
if (fs.existsSync(path)) state = JSON.parse(fs.readFileSync(path, 'utf8'));
function choose() {
  const r = Object.entries(state).map(([k, v]) => ({
    k,
    s: sampleBeta(v.a, v.b),
  }));
  return r.sort((a, b) => b.s - a.s)[0].k;
}
function sampleBeta(a, b) {
  const x = gamma(a),
    y = gamma(b);
  return x / (x + y);
}
function gamma(n) {
  const u = Array.from({ length: 12 }, () => Math.random()).reduce(
    (a, b) => a + b,
    0,
  );
  return -Math.log(u - 6);
}
const variant = choose();
fs.mkdirSync('docs/ops/experiments', { recursive: true });
fs.writeFileSync(
  'docs/ops/experiments/choice.json',
  JSON.stringify({ variant, at: Date.now() }, null, 2),
);
