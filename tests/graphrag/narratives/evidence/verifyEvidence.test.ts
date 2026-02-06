import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEvidenceBundle } from '../../../../src/graphrag/narratives/evidence/verifyEvidence.js';

describe('validateEvidenceBundle', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const passDir = path.resolve(
    __dirname,
    '../../../fixtures/evidence/pass/evidence',
  );
  const failDir = path.resolve(
    __dirname,
    '../../../fixtures/evidence/fail/evidence',
  );

  it('accepts the pass fixture', () => {
    expect(() => validateEvidenceBundle(passDir)).not.toThrow();
  });

  it('rejects the fail fixture', () => {
    expect(() => validateEvidenceBundle(failDir)).toThrow(
      /Timestamp keys found outside stamp.json/,
    );
  });
});
