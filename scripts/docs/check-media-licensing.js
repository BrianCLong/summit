const fs = require('fs');
const path = require('path');
const index = new Map(
  fs
    .readFileSync('docs/_meta/media.csv', 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((l) => {
      const [file, source, license, attr] = l.split(',');
      return [file.trim(), { source, license, attr }];
    }),
);
let fail = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(png|jpe?g|gif|svg)$/i.test(f)) {
      const rel = p.replace(/^docs\//, '');
      if (!index.has(rel)) {
        console.error('Missing media license entry:', rel);
        fail = 1;
      }
    }
  }
})('docs');
process.exit(fail);
