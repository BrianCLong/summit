const Ajv = require('ajv');
const schema = require('../../schemas/connectors/ConnectorContract.v0.1.json');

describe('ConnectorContract Schema Validation', () => {
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  const validContract = {
    identity: {
      name: 'test-connector',
      version: '1.0.0',
      kind: 'source',
      owner: 'team-integration',
    },
    capabilities: {
      read_scopes: ['users:read'],
      write_scopes: [],
      rate_limits: {
        'default': { requests: 100, period_ms: 60000 },
      },
      supported_entities: ['User'],
    },
    idempotency: {
      required_keys: ['transaction_id'],
      semantics: 'at-least-once',
    },
    errors: {
      standard_codes_mapping: {
        '404': 'NOT_FOUND',
      },
    },
    evidence: {
      required_artifacts: ['raw_response'],
    },
    redaction: {
      declared_sensitive_fields: ['password', 'token'],
    },
  };

  test('should validate a correct contract', () => {
    const valid = validate(validContract);
    if (!valid) {
      console.error(validate.errors);
    }
    expect(valid).toBe(true);
  });

  test('should invalidate a contract with missing fields', () => {
    const invalidContract = {
      ...validContract,
      identity: undefined,
    };
    const valid = validate(invalidContract);
    expect(valid).toBe(false);
  });

  test('should invalidate a contract with incorrect enum value', () => {
    const invalidContract = {
      ...validContract,
      identity: {
        ...validContract.identity,
        kind: 'invalid-kind',
      },
    };
    const valid = validate(invalidContract);
    expect(valid).toBe(false);
  });
});
