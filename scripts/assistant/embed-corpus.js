// Pseudocode – integrate with your embeddings provider.
const fs = require('fs');
const corpus = JSON.parse(
  fs.readFileSync('docs/ops/assistant/corpus.json', 'utf8'),
);
// const embed = async (text)=> provider.embed(text)
(async () => {
  const out = [];
  for (const r of corpus) {
    // const vec = await embed(r.title + '\n' + r.summary + '\n' + r.body.slice(0, 4000))
    const vec = Array(768).fill(0); // placeholder
    out.push({ id: r.id, version: r.version, vector: vec });
  }
  fs.writeFileSync('docs/ops/assistant/index.json', JSON.stringify(out));
})();
