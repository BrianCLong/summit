#!/usr/bin/env node
// Input: policy result as JSON { allow: bool, violations: [] }
// Output: deterministic JSON with stable key order, no timestamps.
const fs = require('fs');

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = {
  evidence_id: 'action_pinning_verified',
  version: 1,
  allow: Boolean(input.allow),
  violations: Array.isArray(input.violations)
    ? input.violations.slice().sort()
    : [],
};

process.stdout.write(JSON.stringify(out, null, 2));
