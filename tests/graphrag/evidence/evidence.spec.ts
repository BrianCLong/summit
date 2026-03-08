import { buildEvidenceIndex } from '../../../packages/intelgraph/graphrag/src/index.js';
import { readFileSync } from 'fs';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ajv = new (Ajv as any)({ allErrors: true });
addFormats(ajv);

const indexSchema = JSON.parse(readFileSync('packages/intelgraph/graphrag/src/evidence/schemas/index.schema.json', 'utf-8'));
const validate = ajv.compile(indexSchema);

describe('Evidence System', () => {
  it('should build a valid evidence index', () => {
    const entries = [
      {
        evidence_id: 'EVD-INFOWAR-NARR-001',
        files: ['evidence/report.json', 'evidence/metrics.json', 'evidence/stamp.json'],
      },
    ];
    const index = buildEvidenceIndex(entries);
    expect(index.version).toBe('1.0');
    expect(index.item_slug).toBe('INFOWAR');
    expect(index.entries).toHaveLength(1);

    const isValid = validate(index);
    expect(isValid).toBe(true);
  });
});
