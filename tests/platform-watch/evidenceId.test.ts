import { evidenceId } from '../../src/connectors/platform-watch/evidenceId';

describe('platform-watch evidenceId', () => {
  it('normalizes platform and formats evidence id', () => {
    expect(evidenceId('Maltego Evidence', '20260205', 'AbCdEf12')).toBe(
      'EVD-PLAT-MALTEGO-EVIDENCE-20260205-abcdef12',
    );
  });

  it('rejects invalid date', () => {
    expect(() => evidenceId('maltego', '2026-02-05', 'abcdef12')).toThrow(
      'yyyymmdd must be 8 digits',
    );
  });

  it('rejects invalid hash', () => {
    expect(() => evidenceId('maltego', '20260205', 'abc')).toThrow(
      'hash8 must be 8 hex characters',
    );
  });
});
