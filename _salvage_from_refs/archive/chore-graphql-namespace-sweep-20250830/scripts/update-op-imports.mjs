import globby from 'globby';
import fs from 'node:fs/promises';

const mapPath = 'client/artifacts/op-rename-map.json';
let map;
try {
  map = JSON.parse(await fs.readFile(mapPath, 'utf8'));
} catch {
  console.error('No rename map found at', mapPath);
  process.exit(1);
}

const renameHook = {};
const renameDoc = {};
for (const { oldName, newName } of map) {
  ['Query','Mutation','Subscription'].forEach(suffix => {
    renameHook[`use${oldName}${suffix}`] = `use${newName}${suffix}`;
  });
  renameDoc[`${oldName}Document`] = `${newName}Document`;
}

const files = await globby(['client/src/**/*.{ts,tsx,js,jsx}']);
let total = 0;
for (const f of files) {
  let src = await fs.readFile(f, 'utf8');
  let changed = src;

  Object.entries(renameHook).forEach(([oldId, newId]) => {
    changed = changed.replace(new RegExp(`\\b${oldId}\\b`, 'g'), newId);
  });
  Object.entries(renameDoc).forEach(([oldId, newId]) => {
    changed = changed.replace(new RegExp(`\\b${oldId}\\b`, 'g'), newId);
  });

  if (changed !== src) {
    await fs.writeFile(f, changed, 'utf8');
    total++;
  }
}

console.log(`Updated ${total} files to new operation names.`);

