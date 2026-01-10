const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXCEPTIONS = path.join(ROOT, 'audit', 'exceptions.yaml');

function loadExceptions() {
  const raw = fs.readFileSync(EXCEPTIONS, 'utf-8');
  const parsed = yaml.load(raw);
  if (!parsed || !Array.isArray(parsed.exceptions)) {
    throw new Error('exceptions.yaml is missing an `exceptions` array');
  }
  return parsed.exceptions;
}

function validateRequiredFields(entry) {
  const required = ['id', 'justification', 'approved_by', 'created_at', 'expires_at', 'scope', 'risk', 'mitigation'];
  const missing = required.filter((field) => entry[field] === undefined || entry[field] === null);
  if (missing.length) {
    throw new Error(`Exception ${entry.id || '<unknown>'} missing fields: ${missing.join(', ')}`);
  }
}

function checkExpiry(entry, now) {
  const expires = new Date(entry.expires_at);
  if (Number.isNaN(expires.valueOf())) {
    throw new Error(`Exception ${entry.id} has invalid expires_at date`);
  }
  if (expires < now) {
    throw new Error(`Exception ${entry.id} expired on ${entry.expires_at}`);
  }
}

function main() {
  const now = new Date();
  const exceptions = loadExceptions();
  exceptions.forEach((entry) => {
    validateRequiredFields(entry);
    checkExpiry(entry, now);
  });
  console.log(`Validated ${exceptions.length} exceptions; none are expired.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
