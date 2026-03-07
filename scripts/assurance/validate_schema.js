import fs from 'fs';
import path from 'path';

// Minimal schema validation for index.json
const schema = JSON.parse(fs.readFileSync('schemas/assurance/evidence-pack.schema.json', 'utf-8'));
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));

console.log('Validating index.json schema...');

if (!data.version || !data.items) {
  console.error('Missing required fields version or items');
  process.exit(1);
}

data.items.forEach(item => {
  if (!item.evidence_id || !item.kind || !item.path) {
    console.error(`Invalid item: ${JSON.stringify(item)}`);
    process.exit(1);
  }
  const idPattern = new RegExp(schema.properties.items.items.properties.evidence_id.pattern);
  if (!idPattern.test(item.evidence_id)) {
    console.error(`Evidence ID ${item.evidence_id} does not match pattern`);
    process.exit(1);
  }
});

console.log('Schema validation passed');
