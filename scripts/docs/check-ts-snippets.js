const fs = require('fs');
const child = require('child_process');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = d + '/' + f;
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && files.push(p);
  }
})('docs');
const rx = /```ts\s+test\s+compile[\r\n]+([\s\S]*?)```/g;
let tmp = '';
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(rx)) {
    tmp += m[1] + '\n';
  }
}
fs.writeFileSync('tmp-snippets.ts', tmp);
try {
  child.execSync(
    'npx -y typescript@5 tsc --pretty false --noEmit tmp-snippets.ts',
    { stdio: 'inherit' },
  );
} catch (e) {
  process.exit(1);
}
