import fs from 'fs';
const changed = fs
  .readFileSync('changed.txt', 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean);
const map = JSON.parse(fs.readFileSync('tdts-map.json', 'utf8')) as Array<{
  test: string;
  files: string[];
}>;
const run = new Set<string>();
for (const m of map) {
  if (m.files.some((f) => changed.some((c) => f.startsWith(c.split('/')[0])))) {
    run.add(m.test);
  }
}
fs.writeFileSync('tdts-tests.txt', [...run].join('\n'));
console.log(`TDTS selected ${run.size} tests`);
