import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import assert from 'node:assert';

const SCHEMA_FILE = path.resolve('docs/evidence/schema/post_deploy_evidence.schema.json');
const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf-8'));

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(schema);

console.log("Running schema validation tests...");

// Test Case 1: Valid Evidence
const validEvidence = {
  version: "1.0.0",
  timestamp: new Date().toISOString(),
  commit_sha: "abcdef123456",
  canary: {
    overall_status: "pass",
    checks: [
      { endpoint: "/health", status: "pass", code: 200, latency_ms: 10, error: "" }
    ]
  },
  slo_snapshot: {
      status: "success",
      results: []
  }
};

assert.strictEqual(validate(validEvidence), true, "Valid evidence should pass validation");
console.log("PASS: Valid evidence");

// Test Case 2: Invalid Evidence (missing field)
const invalidEvidence = {
  version: "1.0.0",
  // timestamp missing
  commit_sha: "abcdef123456",
  canary: {
    overall_status: "pass",
    checks: []
  }
};

assert.strictEqual(validate(invalidEvidence), false, "Invalid evidence should fail validation");
console.log("PASS: Invalid evidence (missing timestamp)");

// Test Case 3: Invalid Enum
const invalidEnum = {
    ...validEvidence,
    canary: {
        overall_status: "invalid_status",
        checks: []
    }
};
assert.strictEqual(validate(invalidEnum), false, "Invalid enum should fail validation");
console.log("PASS: Invalid evidence (bad enum)");


console.log("All schema tests passed.");
