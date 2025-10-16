const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : files.push(p);
  }
})('docs');
let failed = 0;
for (const f of files)
  if (/\.mdx?$/.test(f)) {
    const src = fs.readFileSync(f, 'utf8');
    const blocks = [
      ...src.matchAll(/<!--\s*test:.*?-->[\s\S]*?```(\w+)[\s\S]*?```/g),
    ];
    for (const b of blocks) {
      const lang = b[1];
      const code = b[0]
        .split('```' + lang)[1]
        .split('```')[0]
        .trim();
      if (lang === 'bash' || lang === 'sh') {
        const r = spawnSync('bash', ['-n'], { input: code, encoding: 'utf8' });
        if (r.status !== 0) {
          console.error(f, r.stderr);
          failed++;
        }
      }
    }
  }
process.exit(failed ? 1 : 0);
