
const Ajv = require('ajv');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

describe('Gate Policy Schema', () => {
  const schemaPath = path.join(__dirname, '../../schemas/gates/GatePolicy.v0.1.json');
  const yamlPath = path.join(__dirname, '../../ops/gates/gates.yaml');

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const config = yaml.load(fs.readFileSync(yamlPath, 'utf8'));

  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  it('should validate the default gates.yaml against the schema', () => {
    const valid = validate(config);
    if (!valid) {
      console.error(validate.errors);
    }
    expect(valid).toBe(true);
  });

  it('should reject invalid configuration (missing required fields)', () => {
    const invalidConfig = {
      version: "0.1",
      gates: {
          pr: []
          // missing nightly and release
      }
    };
    const valid = validate(invalidConfig);
    expect(valid).toBe(false);
  });

  it('should reject invalid gate entry', () => {
      const invalidConfig = {
        version: "0.1",
        gates: {
            pr: [
                {
                    name: "test",
                    // missing command
                    severity: "warn"
                }
            ],
            nightly: [],
            release: []
        }
      };
      const valid = validate(invalidConfig);
      expect(valid).toBe(false);
  });
});
