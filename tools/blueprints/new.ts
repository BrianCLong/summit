import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
const bp = yaml.load(fs.readFileSync(process.argv[2], 'utf8')) as any;
const name = process.argv[3];
if (!name) throw new Error('Usage: pnpm bp:new <blueprint.yaml> <name>');
for (const f of bp.scaffold.files) {
  const p = f.path.replace(/\$\{name\}/g, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, f.content.replace(/\$\{name\}/g, name));
}
console.log(`✅ scaffolded ${name}`);
