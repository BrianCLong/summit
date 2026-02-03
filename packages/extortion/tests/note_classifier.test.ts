import { describe, it, expect } from 'vitest';
import { classifyNote } from '../src/note_classifier';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Note Classifier', () => {
  it('should classify tactics from the sample ransom note', () => {
    const notePath = join(__dirname, '../fixtures/ransom_note.txt');
    const noteText = readFileSync(notePath, 'utf8');

    const result = classifyNote(noteText);

    expect(result.tactics).toContain('SURVEILLANCE_CLAIM');
    expect(result.tactics).toContain('TIME_PRESSURE');
    expect(result.tactics).toContain('LEGAL_LIABILITY_FRAMING');
    expect(result.tactics).toContain('PUBLIC_SHAMING');
    expect(result.tactics).toContain('DATA_DISCLOSURE_THREAT');
    expect(result.tactics).toContain('DOWNTIME_EMPHASIS');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should handle empty or unrelated text', () => {
    const result = classifyNote('Hello world, this is a nice day.');
    expect(result.tactics).toHaveLength(0);
    expect(result.confidence).toBe(0.1);
  });
});
