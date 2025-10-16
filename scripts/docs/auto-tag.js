const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { TfIdf } = require('natural');
const tfidf = new TfIdf();
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && files.push(p);
  }
})('docs');
files.forEach((f) =>
  tfidf.addDocument(fs.readFileSync(f, 'utf8').replace(/```[\s\S]*?```/g, '')),
);
const keywords = (i) =>
  tfidf
    .listTerms(i)
    .slice(0, 8)
    .map((t) => t.term);
files.forEach((f, i) => {
  const g = matter.read(f);
  g.data.tags = Array.from(new Set([...(g.data.tags || []), ...keywords(i)]));
  fs.writeFileSync(f, matter.stringify(g.content, g.data));
});
