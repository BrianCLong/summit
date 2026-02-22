const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');

const {
  findViolationsInContent,
  FORBIDDEN_PATTERNS,
} = require('../policy/forbid-registry-secrets.cjs');

test('detects forbidden registry secret patterns', () => {
  const fixturePath = path.join(
    __dirname,
    'fixtures',
    'forbidden-secrets.fixture.yml',
  );
  const content = fs.readFileSync(fixturePath, 'utf8');
  const violations = findViolationsInContent(
    content,
    'fixtures/forbidden-secrets.fixture.yml',
    FORBIDDEN_PATTERNS,
  );

  const matchedPatterns = violations.map((violation) => violation.pattern);
  assert.ok(matchedPatterns.some((pattern) => pattern.includes('NPM_TOKEN')));
  assert.ok(
    matchedPatterns.some((pattern) => pattern.includes('CODEARTIFACT_AUTH_TOKEN')),
  );
});

test('ignores content without forbidden secrets', () => {
  const safeContent = 'env:\n  REGISTRY_AUTH: ${{ secrets.REGISTRY_OIDC }}';
  const violations = findViolationsInContent(
    safeContent,
    'fixtures/safe.yml',
    FORBIDDEN_PATTERNS,
  );

  assert.equal(violations.length, 0);
});
