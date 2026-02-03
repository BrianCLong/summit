import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import Ajv from 'ajv';
import { stableJson } from '../lib/governance_evidence.mjs';

const fixturesDir = path.join(
  process.cwd(),
  'scripts',
  'ci',
  '__tests__',
  'fixtures',
  'governance-evidence',
);
const schemasDir = path.join(process.cwd(), 'schemas', 'governance');

const fixtures = [
  {
    name: 'required-checks-policy.pass.json',
    schema: 'required-checks-policy.evidence.schema.json',
  },
  {
    name: 'required-checks-policy.fail.json',
    schema: 'required-checks-policy.evidence.schema.json',
  },
  {
    name: 'branch-protection.match.json',
    schema: 'branch-protection-audit.evidence.schema.json',
  },
  {
    name: 'branch-protection.drift.json',
    schema: 'branch-protection-audit.evidence.schema.json',
  },
  {
    name: 'branch-protection.unverifiable.json',
    schema: 'branch-protection-audit.evidence.schema.json',
  },
  {
    name: 'determinism.pass.json',
    schema: 'determinism-scan.evidence.schema.json',
  },
  {
    name: 'determinism.fail.json',
    schema: 'determinism-scan.evidence.schema.json',
  },
];

const ajv = new Ajv({ allErrors: true, strict: true });

for (const fixture of fixtures) {
  test(`governance evidence fixture ${fixture.name} validates`, () => {
    const fixturePath = path.join(fixturesDir, fixture.name);
    const schemaPath = path.join(schemasDir, fixture.schema);
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const parsed = JSON.parse(raw);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    const validate = ajv.compile(schema);
    const valid = validate(parsed);
    assert.ok(valid, `Schema errors: ${JSON.stringify(validate.errors)}`);

    const normalized = stableJson(parsed);
    assert.equal(normalized, raw, 'Fixture must be stable-serialized');
  });
}

test('determinism findings are sorted by file then pointer', () => {
  const fixturePath = path.join(fixturesDir, 'determinism.fail.json');
  const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const findings = parsed.findings;
  assert.ok(findings.length >= 2, 'Expected multiple findings');
  const [first, second] = findings;
  assert.ok(first.file <= second.file);
  if (first.file === second.file) {
    assert.ok(first.pointer <= second.pointer);
  }
});
