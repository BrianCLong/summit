const fs = require('fs');
const path = require('path');
const rxEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const rxName = /\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/g; // heuristic
let hits = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.(mdx?|json|csv)$/i.test(f) && scan(p);
  }
})('docs');
function scan(p) {
  const txt = fs.readFileSync(p, 'utf8');
  const emails = [...txt.matchAll(rxEmail)].map((m) => m[0]);
  const names = [...txt.matchAll(rxName)].map((m) => m[0]);
  if (emails.length || names.length)
    hits.push({
      p,
      emails: [...new Set(emails)],
      names: [...new Set(names)].slice(0, 5),
    });
}
fs.mkdirSync('docs/ops/privacy', { recursive: true });
fs.writeFileSync(
  'docs/ops/privacy/pii-hits.json',
  JSON.stringify(hits, null, 2),
);
console.log('PII hits:', hits.length);
