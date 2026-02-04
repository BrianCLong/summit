import fs from 'fs';
import path from 'path';

describe('Claim-Level GraphRAG Metrics Contract', () => {
  const rootDir = process.cwd();

  // This test validates that the mock metrics (if generated) or the schema allow the required fields.
  // We can load the schema and check if it allows the properties.

  test('Metrics schema should allow support rates', () => {
    const schemaPath = path.join(rootDir, 'evidence', 'schemas', 'metrics.schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    // Check if additionalProperties is true or number, effectively allowing dynamic metrics.
    // My schema defined "additionalProperties": { "type": "number" }

    expect(schema.properties.metrics.additionalProperties).toEqual({ "type": "number" });
  });
});
