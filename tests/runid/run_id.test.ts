import { generateRunId, isValidRunIdv7, isValidUuid } from '../../src/runid/run_id';
import { v4 as uuidv4 } from 'uuid';

describe('Run ID Helpers', () => {
  it('should generate a valid UUIDv7', () => {
    const id = generateRunId();
    expect(isValidRunIdv7(id)).toBe(true);
    expect(isValidUuid(id)).toBe(true);
  });

  it('should validate UUIDv7 correctly', () => {
    const id = generateRunId();
    expect(isValidRunIdv7(id)).toBe(true);
  });

  it('should reject non-v7 UUIDs for v7 check', () => {
    const v4 = uuidv4();
    expect(isValidRunIdv7(v4)).toBe(false);
    expect(isValidUuid(v4)).toBe(true);
  });

  it('should reject invalid strings', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });
});
