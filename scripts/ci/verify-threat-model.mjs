import fs from 'fs';
import yaml from 'js-yaml';

const model = yaml.load(fs.readFileSync('docs/security/threat-model.yml', 'utf8'));

for (const t of model.threats) {
  if (!fs.existsSync(t.evidence)) {
    console.error(`Missing evidence for threat ${t.id}: ${t.evidence}`);
    process.exit(1);
  }
}

console.log('Threat model evidence verified');
