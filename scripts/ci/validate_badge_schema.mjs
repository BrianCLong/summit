#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

const repoRoot = process.cwd();
const schemaPath = path.join(repoRoot, 'schemas', 'badges', 'endpoint_badge_v1.jsonschema');
const badgePath = process.env.BADGE_INPUT || path.join(repoRoot, 'out', 'evidence', 'badge.json');

if (!fs.existsSync(schemaPath)) {
  console.error(`Missing schema: ${schemaPath}`);
  process.exit(1);
}

if (!fs.existsSync(badgePath)) {
  console.error(`Missing badge payload: ${badgePath}`);
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const badge = JSON.parse(fs.readFileSync(badgePath, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(schema);

if (!validate(badge)) {
  console.error('Badge schema validation failed.');
  for (const error of validate.errors || []) {
    console.error(`- ${error.instancePath || '/'} ${error.message}`);
  }
  process.exit(1);
}

console.log('Badge schema validation passed.');
