import { describe, expect, it } from 'vitest';
import { isInternalPath, isExternalUrl } from '../../src/lib/route';

describe('route utilities', () => {
  describe('isInternalPath', () => {
    it('returns true for internal paths starting with /', () => {
      expect(isInternalPath('/summit')).toBe(true);
      expect(isInternalPath('/about')).toBe(true);
      expect(isInternalPath('/')).toBe(true);
    });

    it('returns false for external URLs', () => {
      expect(isInternalPath('https://example.com')).toBe(false);
      expect(isInternalPath('http://example.com')).toBe(false);
    });

    it('returns false for protocol-relative URLs', () => {
      expect(isInternalPath('//example.com')).toBe(false);
    });
  });

  describe('isExternalUrl', () => {
    it('returns true for http URLs', () => {
      expect(isExternalUrl('http://example.com')).toBe(true);
    });

    it('returns true for https URLs', () => {
      expect(isExternalUrl('https://example.com')).toBe(true);
    });

    it('returns true for protocol-relative URLs', () => {
      expect(isExternalUrl('//example.com')).toBe(true);
    });

    it('returns false for internal paths', () => {
      expect(isExternalUrl('/summit')).toBe(false);
      expect(isExternalUrl('/about')).toBe(false);
    });
  });
});
