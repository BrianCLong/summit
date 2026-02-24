import fs from 'node:fs';
import crypto from 'node:crypto';
import yaml from 'js-yaml';

const args = Object.fromEntries(process.argv.slice(2).map(a=>a.split('=').map(s=>s.replace(/^--/,'')).slice(-2)));
const policy = yaml.load(fs.readFileSync(args.policy,'utf8'));
const allowed = new Set(policy.allowed_ids);

if (!fs.existsSync(args.dir)) {
    console.error(`Evidence directory not found: ${args.dir}`);
    process.exit(1);
}

for (const file of fs.readdirSync(args.dir)) {
  if (!file.endsWith('.json')) continue;
  const doc = JSON.parse(fs.readFileSync(`${args.dir}/${file}`,'utf8'));
  if (!allowed.has(doc.id)) {
    console.error(`Unknown evidence id: ${doc.id} in ${file}`);
    process.exit(1);
  }
  if (!doc.subject?.sha256) {
    console.error(`Missing subject.sha256 in ${file}`);
    process.exit(1);
  }
  // TODO: verify signature against pinned pubkeys
}
console.log('Evidence policy OK');
