import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schemaDir = path.resolve('src/graphrag/evidence/schemas');
const reportSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'report.schema.json'), 'utf8'));

describe('Evidence System Governance', () => {
  it('should pass validation for a correct INFOWAR report', () => {
    const validReport = {
      evidence_id: "EVD-INFOWAR-TEST-001",
      item_slug: "INFOWAR",
      summary: "Test summary",
      findings: ["Finding 1"]
    };
    const validate = ajv.compile(reportSchema);
    expect(validate(validReport)).toBe(true);
  });

  it('should fail validation if item_slug is not INFOWAR (deny-by-default)', () => {
    const invalidReport = {
      evidence_id: "EVD-OTHER-TEST-001",
      item_slug: "OTHER", // Should be INFOWAR
      summary: "Test summary"
    };
    const validate = ajv.compile(reportSchema);
    expect(validate(invalidReport)).toBe(false);
  });

  it('should fail validation if mandatory fields are missing', () => {
    const incompleteReport = {
      evidence_id: "EVD-INFOWAR-TEST-002"
      // missing summary and item_slug
    };
    const validate = ajv.compile(reportSchema);
    expect(validate(incompleteReport)).toBe(false);
  });
});
