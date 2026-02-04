import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(2).map(a=>a.split(' ').join('').split('=').map(s=>s.replace(/^--/,'')).slice(-2)));
const { release, commit, evidenceDir = 'evidence', out } = args;

// Mapping for args that might be passed with - instead of camelCase if parsed manually like this
const eDir = args['evidence-dir'] || evidenceDir;

if (!fs.existsSync(eDir)) {
    console.error(`Evidence directory not found: ${eDir}`);
    // Create it empty to avoid failure if no evidence yet?
    // No, better to fail or create it.
    // Given the workflow builds it, it should exist.
    process.exit(1);
}

const items = [];
for (const f of fs.readdirSync(eDir).filter(x=>x.endsWith('.json'))) {
  const buf = fs.readFileSync(`${eDir}/${f}`);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const id = JSON.parse(buf).id;
  items.push({ id, path: `${eDir}/${f}`, sha256 });
}
const index = { release, commit, items };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(index, null, 2));
console.log(`Wrote ${out}`);
