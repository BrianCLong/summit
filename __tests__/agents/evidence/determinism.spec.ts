import { describe, it, expect } from 'vitest';
import { nextEvidenceId } from '../../../agents/openclaw_plane/evidence/evidenceIds';

describe('evidenceIds', () => {
  it('should generate deterministic evidence IDs', () => {
    expect(nextEvidenceId('run-123', 1)).toBe('EVID:OA:run-123:000001');
    expect(nextEvidenceId('run-123', 42)).toBe('EVID:OA:run-123:000042');
  });
});
