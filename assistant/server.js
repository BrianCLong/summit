const fs = require('fs');
const idx = JSON.parse(
  fs.readFileSync('docs/ops/assistant/index.json', 'utf8'),
);
const corpus = Object.fromEntries(
  JSON.parse(fs.readFileSync('docs/ops/assistant/corpus.json', 'utf8')).map(
    (x) => [x.id, x],
  ),
);
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function norm(a) {
  return Math.sqrt(dot(a, a));
}
exports.retrieve = function (queryVec, k = 5) {
  const scored = idx.map((r) => ({
    id: r.id,
    score: dot(queryVec, r.vector) / (norm(queryVec) * norm(r.vector) || 1),
  }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => ({ ...s, doc: corpus[s.id] }));
};
