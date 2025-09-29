import globby from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';

const mapDirToPrefix = (p) => {
  const s = p.toLowerCase();
  if (s.includes('/dashboard')) return 'DB';
  if (s.includes('/graphworkbench') || s.includes('/graph')) return 'GW';
  if (s.includes('/investigation')) return 'IG';
  if (s.includes('/hunts') || s.includes('/threat')) return 'HT';
  if (s.includes('/ioc')) return 'IOC';
  if (s.includes('/search')) return 'SRCH';
  return null;
};

const opRe = /\b(query|mutation|subscription)\s+([A-Za-z0-9_]+)/g;

const renamed = [];
for (const file of await globby('client/src/**/*.graphql')) {
  const src = await fs.readFile(file, 'utf8');
  const prefix = mapDirToPrefix(file);
  if (!prefix) continue;
  let changed = src;
  let hit = false;

  changed = changed.replace(opRe, (m, kind, name) => {
    if (/^(DB|GW|IG|HT|IOC|SRCH)_/.test(name)) return m;
    const newName = `${prefix}_${name}`;
    renamed.push({ file, kind, oldName: name, newName });
    hit = true;
    return `${kind} ${newName}`;
  });

  if (hit) await fs.writeFile(file, changed, 'utf8');
}

const mapPath = path.resolve('client/artifacts/op-rename-map.json');
await fs.mkdir(path.dirname(mapPath), { recursive: true });
await fs.writeFile(mapPath, JSON.stringify(renamed, null, 2), 'utf8');
console.log(`Renamed ${renamed.length} operations. Map: ${mapPath}`);

