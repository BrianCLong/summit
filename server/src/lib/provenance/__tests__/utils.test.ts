import { createProvenance, attachProvenance } from '../utils';

describe('Provenance Utils', () => {
  it('should create a provenance metadata object', () => {
    const provenance = createProvenance(
      'test-system',
      'test-id',
      'job-123',
      0.9,
      'test-owner'
    );
    expect(provenance.sourceSystem).toBe('test-system');
    expect(provenance.sourceIdentifier).toBe('test-id');
    expect(provenance.ingestJobId).toBe('job-123');
    expect(provenance.trustLevel).toBe(0.9);
    expect(provenance.dataOwner).toBe('test-owner');
    expect(provenance.ingestTimestamp).toBeDefined();
  });

  it('should attach provenance to an object', () => {
    const record = { name: 'test' };
    const provenance = createProvenance(
      'test-system',
      'test-id',
      'job-123',
      0.9,
      'test-owner'
    );
    const recordWithProvenance = attachProvenance(record, provenance);
    expect(recordWithProvenance).toEqual({
      name: 'test',
      provenance,
    });
  });
});
