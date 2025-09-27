import globby from 'globby';
import fs from 'node:fs/promises';

const names = new Map();
const dupes = [];
for (const f of await globby(['client/src/**/*.graphql'])) {
  const s = await fs.readFile(f, 'utf8');
  for (const m of s.matchAll(/\b(query|mutation|subscription)\s+([A-Za-z0-9_]+)/g)) {
    const name = m[2];
    if (names.has(name)) dupes.push(`${name} -> ${names.get(name)}, ${f}`);
    else names.set(name, f);
  }
}
if (dupes.length) {
  console.error('Duplicate GraphQL operation names:\n' + dupes.join('\n'));
  process.exit(1);
}
console.log('No duplicate operation names.');

