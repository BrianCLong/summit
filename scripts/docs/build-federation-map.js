const fs = require('fs');
function list(dir) {
  const out = [];
  const walk = (d) =>
    fs.readdirSync(d).forEach((f) => {
      const p = d + '/' + f;
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/\.mdx?$/.test(f)) out.push(p.replace(/^external\//, ''));
    });
  walk('external');
  return out;
}
const files = fs.existsSync('external') ? list('external') : [];
fs.mkdirSync('docs/ops', { recursive: true });
fs.writeFileSync(
  'docs/ops/federation-map.json',
  JSON.stringify({ files }, null, 2),
);
console.log('Federated files:', files.length);
