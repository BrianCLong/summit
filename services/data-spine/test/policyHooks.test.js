const test = require('node:test');
const assert = require('node:assert');
const { applyPolicies, reversePolicies } = require('../src/policyHooks');
const schema = require('../contracts/customer-profile/1.0.0/schema.json');

test('redacts and tokenizes PII in lower environments', () => {
  const record = {
    id: '123',
    email: 'person@example.com',
    ssn: '123-45-6789',
    home_region: 'us-east-1'
  };
  const result = applyPolicies(record, schema, { environment: 'dev', region: 'us-east-1' });
  assert.notStrictEqual(result.email, record.email);
  assert.match(result.email, /^[A-Za-z0-9+/=]+$/);
  assert.strictEqual(result.ssn, '[REDACTED]');
  assert.strictEqual(result.home_region, 'us-east-1');
  const restored = reversePolicies(result, schema, { environment: 'dev', region: 'us-east-1' });
  assert.strictEqual(restored.email, record.email);
});

test('throws when residency policy violated', () => {
  assert.throws(() =>
    applyPolicies(
      { id: '1', email: 'a@b.com', ssn: '123-45-6789', home_region: 'us-east-1' },
      schema,
      { environment: 'prod', region: 'ap-south-1' }
    )
  );
});
