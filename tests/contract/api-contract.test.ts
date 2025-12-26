import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { OpenApiSchemaValidator } from 'openapi-schema-validator';
import { deterministicNormalize } from '../testkit/golden/index.js';

const specPath = path.join(process.cwd(), 'api', 'spec', 'openapi.yaml');
const spec = YAML.parse(fs.readFileSync(specPath, 'utf-8'));
const validator = new OpenApiSchemaValidator({ version: 3 });

const fixtures = {
  '/health': { status: 'ok', uptime: 123.45 },
  '/flags': { flags: [{ key: 'search-v2', enabled: true }] },
  '/search': {
    results: [
      { id: 'abc', score: 0.9, title: 'Intel' },
      { id: 'def', score: 0.8, title: 'Workspace' },
    ],
  },
  '/workspace': {
    id: 'workspace-1',
    name: 'Mission Control',
    members: [
      { id: 'user-1', role: 'admin' },
      { id: 'user-2', role: 'analyst' },
    ],
  },
  '/activity': {
    items: [
      { id: 'evt-1', type: 'created', createdAt: '2024-12-24T12:34:56Z' },
      { id: 'evt-2', type: 'updated', createdAt: '2024-12-25T12:34:56Z' },
    ],
  },
  '/version': {
    supported: ['v1', 'v2'],
    default: 'v1',
  },
};

describe('API contract validation', () => {
  test.each(Object.entries(fixtures))(
    'response for %s conforms to spec',
    (pathKey, payload) => {
      const pathDef = spec.paths[pathKey];
      const responseSchema = pathDef?.get?.responses?.['200']?.content?.['application/json']?.schema;
      expect(responseSchema).toBeTruthy();
      const result = validator.validate(
        deterministicNormalize(payload),
        responseSchema,
      );
      if (!result.valid) {
        throw new Error(`Contract mismatch for ${pathKey}: ${JSON.stringify(result.errors, null, 2)}`);
      }
    },
  );
});
