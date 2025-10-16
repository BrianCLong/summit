import fs from 'fs';
type Span = { name: string; attributes: Record<string, any> };
const spans: Span[] = JSON.parse(fs.readFileSync('otel-spans.json', 'utf8')); // exported from CI run
const map = new Map<string, Set<string>>(); // testName -> files
for (const s of spans) {
  const test = s.attributes['test.name'];
  const file = s.attributes['code.filepath'];
  if (!test || !file) continue;
  if (!map.has(test)) map.set(test, new Set());
  map.get(test)!.add(file);
}
fs.writeFileSync(
  'tdts-map.json',
  JSON.stringify([...map].map(([k, v]) => ({ test: k, files: [...v] }))),
);
