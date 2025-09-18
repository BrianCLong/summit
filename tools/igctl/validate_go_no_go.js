#!/usr/bin/env node
// Basic schema validation for tools/igctl/go-no-go-extensions.yaml
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const file = process.argv[2] || path.join(__dirname, 'go-no-go-extensions.yaml');
const raw = fs.readFileSync(file, 'utf8');
const data = yaml.load(raw);

if (!Array.isArray(data)) {
  console.error('Expected YAML to be an array of gate definitions');
  process.exit(1);
}

const requiredTop = ['id', 'name', 'thresholds', 'validators', 'decision'];
let ok = true;
data.forEach((gate, i) => {
  requiredTop.forEach((k) => {
    if (!(k in gate)) {
      console.error(`Gate[${i}] missing key: ${k}`);
      ok = false;
    }
  });
  if (typeof gate.id !== 'string' || !gate.id) { console.error(`Gate[${i}] invalid id`); ok = false; }
  if (!Array.isArray(gate.validators) || gate.validators.length === 0) { console.error(`Gate[${i}] validators must be non-empty array`); ok = false; }
  if (typeof gate.thresholds !== 'object') { console.error(`Gate[${i}] thresholds must be object`); ok = false; }
  if (!['fail_on_any_breach','pass_on_all'].includes(String(gate.decision))) {
    console.error(`Gate[${i}] decision should be 'fail_on_any_breach' or 'pass_on_all'`);
    ok = false;
  }
});

if (!ok) process.exit(2);
console.log(`Validated ${data.length} gates in ${file}`);
