#!/usr/bin/env node
// Verify a SLSA provenance attestation JSON file.
// Usage: verify-provenance.js <provenance.json>

import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: verify-provenance.js <provenance.json>');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`Failed to parse ${file}: ${e.message}`);
  process.exit(1);
}

const errors = [];

if (!data._type?.includes('in-toto')) {
  errors.push('Missing or invalid _type (expected in-toto Statement)');
}

if (!data.predicateType?.includes('slsa.dev/provenance')) {
  errors.push('Missing or invalid predicateType (expected SLSA provenance)');
}

if (!Array.isArray(data.subject) || data.subject.length === 0) {
  errors.push('subject must be a non-empty array');
}

for (const subj of data.subject ?? []) {
  if (!subj.digest?.sha256) {
    errors.push(`Subject "${subj.name}" missing sha256 digest`);
  }
}

if (!data.predicate?.builder?.id) {
  errors.push('predicate.builder.id is required');
}

if (!data.predicate?.materials || data.predicate.materials.length === 0) {
  errors.push('predicate.materials must be non-empty');
}

if (errors.length > 0) {
  console.error('Provenance verification FAILED:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('Provenance verification PASSED');
