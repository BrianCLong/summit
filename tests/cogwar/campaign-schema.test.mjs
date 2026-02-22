import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const schemaPath = path.join(
  repoRoot,
  'schemas',
  'cogwar',
  'campaign.v1.schema.json'
);

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateCampaign(payload) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(loadJson(schemaPath));
  const valid = validate(payload);
  const errorCodes = (validate.errors || [])
    .map(error => `${error.instancePath || '/'}:${error.keyword}`)
    .sort();
  return { valid, errorCodes };
}

const fixturesDir = path.join(__dirname, 'fixtures');

function loadFixture(name) {
  return loadJson(path.join(fixturesDir, name));
}

test('valid campaign example passes schema validation', () => {
  const payload = loadJson(
    path.join(repoRoot, 'examples', 'cogwar', 'ru-ua', 'dirty-bomb.campaign.json')
  );
  const result = validateCampaign(payload);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errorCodes, []);
});

test('missing required fields emits stable error codes', () => {
  const payload = loadFixture('missing-required.campaign.json');
  const result = validateCampaign(payload);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errorCodes, [
    '/:required',
    '/:required',
    '/:required',
    '/:required',
    '/:required',
    '/:required',
    '/:required',
    '/:required',
  ]);
});

test('attributed without evidence_refs fails schema validation', () => {
  const payload = loadFixture('attributed-without-evidence.campaign.json');
  const result = validateCampaign(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errorCodes.includes('/attribution/evidence_refs:minItems'));
});

test('oversize indicators list fails schema validation', () => {
  const payload = loadFixture('oversize-indicators.campaign.json');
  const result = validateCampaign(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errorCodes.includes('/indicators:maxItems'));
});

test('raw_content payload is rejected by schema', () => {
  const payload = loadFixture('raw-content.campaign.json');
  const result = validateCampaign(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errorCodes.includes('/:additionalProperties'));
});
