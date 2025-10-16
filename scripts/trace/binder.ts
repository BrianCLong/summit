import fs from 'fs';
const specs = new Set(
  JSON.parse(fs.readFileSync('artifacts/specs.json', 'utf8')),
);
const annos = Array.from(
  fs
    .readFileSync('coverage/annotations.txt', 'utf8')
    .matchAll(/@spec (SPEC-\d+)/g),
).map((m) => m[1]);
const missing = [...specs].filter((id) => !annos.includes(id));
if (missing.length) {
  console.error('Missing spec tests:', missing);
  process.exit(1);
}
