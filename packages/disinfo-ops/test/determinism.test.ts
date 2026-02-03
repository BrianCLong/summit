import { describe, it, expect } from 'vitest';
import { stableStringify } from '../src/lib/deterministic_json.js';
import { generateEvidenceId } from '../src/lib/evidence_id.js';
import Ajv from 'ajv';
import reportSchema from '../schemas/report.schema.json';

describe('Disinfo Ops Determinism', () => {
  it('should stringify JSON consistently regardless of key order', () => {
    const obj1 = { a: 1, b: 2, c: { d: 3, e: 4 } };
    const obj2 = { b: 2, a: 1, c: { e: 4, d: 3 } };
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it('should generate valid Evidence IDs', () => {
    const id = generateEvidenceId();
    expect(id).toMatch(/^EVD-OPS-\d{14}-[0-9A-F]{8}$/);
  });

  it('should validate report schema', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(reportSchema);
    const validReport = {
      evidence_id: 'EVD-TEST-001',
      job_id: 'JOB-001',
      verdict: 'UNCLEAR',
      summary: 'Test summary',
      limitations: ['Test limitation'],
      claims: [{ text: 'Test claim', status: 'pending' }]
    };
    const valid = validate(validReport);
    if (!valid) console.log(validate.errors);
    expect(valid).toBe(true);
  });
});
