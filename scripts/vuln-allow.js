const fs = require('fs');
const yaml = require('js-yaml');
const list = yaml.load(fs.readFileSync('.security/allowlist.yaml', 'utf8'));
const today = new Date().toISOString().slice(0,10);
for (const e of list.exceptions) {
  if (e.expires < today) { console.error(`Expired exception ${e.id}`); process.exit(1); }
}
console.log('✅ Exceptions valid');