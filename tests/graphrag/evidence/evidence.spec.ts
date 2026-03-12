import { buildEvidenceIndex, EvidenceIndexEntry } from '../../../src/graphrag/evidence';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

const ajv = new Ajv();
addFormats(ajv);

const schemasPath = path.join(process.cwd(), 'src/graphrag/evidence/schemas');
const indexSchema = JSON.parse(fs.readFileSync(path.join(schemasPath, 'index.schema.json'), 'utf8'));
const reportSchema = JSON.parse(fs.readFileSync(path.join(schemasPath, 'report.schema.json'), 'utf8'));

describe('Evidence System', () => {
  describe('buildEvidenceIndex', () => {
    it('should build a deterministic index with sorted entries', () => {
      const entries: EvidenceIndexEntry[] = [
        { evidence_id: 'EVD-INFOWAR-NARR-002', files: ['file2.json'] },
        { evidence_id: 'EVD-INFOWAR-NARR-001', files: ['file1.json'] },
      ];

      const index = buildEvidenceIndex(entries);

      expect(index.version).toBe('1.0');
      expect(index.item_slug).toBe('INFOWAR');
      expect(index.entries[0].evidence_id).toBe('EVD-INFOWAR-NARR-001');
      expect(index.entries[1].evidence_id).toBe('EVD-INFOWAR-NARR-002');
    });
  });

  describe('Schema Validation', () => {
    it('should validate a correct index', () => {
      const index = {
        version: '1.0',
        item_slug: 'INFOWAR',
        entries: [
          { evidence_id: 'EVD-INFOWAR-NARR-001', files: ['report.json', 'metrics.json'] }
        ]
      };

      const validate = ajv.compile(indexSchema);
      const valid = validate(index);
      expect(valid).toBe(true);
    });

    it('should fail on missing evidence_id (deny-by-default)', () => {
      const index = {
        version: '1.0',
        item_slug: 'INFOWAR',
        entries: [
          { files: ['report.json'] }
        ]
      } as any;

      const validate = ajv.compile(indexSchema);
      const valid = validate(index);
      expect(valid).toBe(false);
    });

    it('should fail on invalid evidence_id format', () => {
      const report = {
        evidence_id: 'INVALID-ID',
        summary: 'Test',
        details: {}
      };

      const validate = ajv.compile(reportSchema);
      const valid = validate(report);
      expect(valid).toBe(false);
    });

    it('should validate a correct report', () => {
      const report = {
        evidence_id: 'EVD-INFOWAR-OPS-001',
        summary: 'Operational report',
        details: { key: 'value' }
      };

      const validate = ajv.compile(reportSchema);
      const valid = validate(report);
      expect(valid).toBe(true);
    });
  });
});
