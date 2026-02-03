#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

const repoRoot = process.cwd();
const schemaDir = path.join(repoRoot, 'schemas', 'governance');
const evidenceDir = path.join(repoRoot, 'artifacts', 'governance');

const schemaFiles = {
  required: 'required-checks-policy.evidence.schema.json',
  branch: 'branch-protection-audit.evidence.schema.json',
  determinism: 'determinism-scan.evidence.schema.json',
};

const evidenceFiles = {
  required: 'required-checks-policy.evidence.json',
  branch: 'branch-protection-audit.evidence.json',
  determinism: 'determinism-scan.evidence.json',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const ajv = new Ajv({ allErrors: true, strict: true });
let hasError = false;

for (const [key, schemaName] of Object.entries(schemaFiles)) {
  const schemaPath = path.join(schemaDir, schemaName);
  const evidencePath = path.join(evidenceDir, evidenceFiles[key]);

  if (!fs.existsSync(schemaPath)) {
    console.error(`Missing schema: ${schemaPath}`);
    hasError = true;
    continue;
  }
  if (!fs.existsSync(evidencePath)) {
    console.error(`Missing evidence: ${evidencePath}`);
    hasError = true;
    continue;
  }

  const schema = readJson(schemaPath);
  const evidence = readJson(evidencePath);
  const validate = ajv.compile(schema);
  const valid = validate(evidence);
  if (!valid) {
    console.error(`Schema validation failed for ${evidenceFiles[key]}`);
    for (const error of validate.errors || []) {
      console.error(`- ${error.instancePath || '/'} ${error.message}`);
    }
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log('Governance evidence schema validation passed.');
