import { RACF, RYVF } from '../../src/graphrag/ren/ecf';
import { generateEvidenceId } from '../../src/graphrag/ren/evidence';
import sampleRacf from '../../src/graphrag/ren/fixtures/sample_racf.json';

describe('REN ECF', () => {
  it('should validate sample RACF fixture structure', () => {
    const artifact = sampleRacf[0] as unknown as RACF;
    expect(artifact.tenant_id).toBe('tenant-123');
    expect(artifact.artifact_type).toBe('foia_response');
    expect(artifact.access_level).toBe('public');
  });

  it('should generate deterministic evidence IDs', () => {
    const id1 = generateEvidenceId('TEST', 'content1');
    const id2 = generateEvidenceId('TEST', 'content1');
    const id3 = generateEvidenceId('TEST', 'content2');

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).toMatch(/^EVD-REN-TEST-[0-9A-F]{16}$/);
  });
});
