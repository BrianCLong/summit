const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const lintSchema = {
  type: 'object',
  required: ['openapi', 'info', 'paths', 'components'],
  properties: {
    openapi: { type: 'string' },
    info: {
      type: 'object',
      required: ['title', 'version', 'description'],
      properties: {
        title: { type: 'string' },
        version: { type: 'string' },
        description: { type: 'string' },
      },
      additionalProperties: true,
    },
    paths: { type: 'object' },
    components: { type: 'object' },
  },
  additionalProperties: true,
};

describe('openapi/receipts.yaml', () => {
  const specPath = path.join(process.cwd(), 'openapi', 'receipts.yaml');
  const raw = fs.readFileSync(specPath, 'utf8');

  it('parses as YAML', () => {
    const doc = yaml.load(raw);
    expect(typeof doc).toBe('object');
    expect(doc?.paths?.['/api/conductor/evidence/receipt']).toBeDefined();
    expect(doc?.paths?.['/api/conductor/evidence/receipt/{runId}']).toBeDefined();
  });

  it('satisfies the lint schema and includes mapped errors', () => {
    const doc = yaml.load(raw);
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(lintSchema);
    const valid = validate(doc);
    if (!valid && validate.errors) {
      // eslint-disable-next-line no-console
      console.error(validate.errors);
    }
    expect(valid).toBe(true);
    const errorResponses = doc?.components?.responses || {};
    ['BadRequest', 'Unauthorized', 'Forbidden', 'NotFound', 'Conflict', 'TooManyRequests', 'ServerError'].forEach((key) => {
      expect(errorResponses[key]).toBeDefined();
    });
  });
});
