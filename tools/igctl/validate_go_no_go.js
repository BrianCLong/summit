#!/usr/bin/env node
// Schema validation for tools/igctl/go-no-go-extensions.yaml
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--schema') out.schema = args[++i];
    else if (args[i] === '--file') out.file = args[++i];
    else if (!out.file) out.file = args[i];
  }
  return out;
}

const { schema = path.join(__dirname, 'go-no-go.schema.json'), file = path.join(__dirname, 'go-no-go-extensions.yaml') } = parseArgs();

const raw = fs.readFileSync(file, 'utf8');
const data = yaml.load(raw);

// Support both legacy array-of-gates and new object { gates: [...] }
const doc = Array.isArray(data) ? { gates: data } : data;

const schemaJson = JSON.parse(fs.readFileSync(schema, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(schemaJson);
if (!validate(doc)) {
  console.error('Schema validation failed:');
  console.error(validate.errors);
  process.exit(1);
}

// Additional uniqueness check for IDs
const ids = new Set();
for (const g of doc.gates) {
  if (ids.has(g.id)) {
    console.error(`Duplicate gate id: ${g.id}`);
    process.exit(1);
  }
  ids.add(g.id);
}

console.log(`Validated ${doc.gates.length} gates in ${file}`);
