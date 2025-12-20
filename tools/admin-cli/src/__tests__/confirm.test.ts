/**
 * Tests for confirmation utilities
 */

import { CONFIRMATION_PHRASES, isInteractive } from '../utils/confirm.js';

describe('Confirmation Utilities', () => {
  describe('CONFIRMATION_PHRASES', () => {
    it('should have DELETE phrase', () => {
      expect(CONFIRMATION_PHRASES.DELETE).toBe('I understand this will delete data');
    });

    it('should have SUSPEND phrase', () => {
      expect(CONFIRMATION_PHRASES.SUSPEND).toBe('I understand this will suspend the tenant');
    });

    it('should have ROTATE phrase', () => {
      expect(CONFIRMATION_PHRASES.ROTATE).toBe('I understand this will rotate keys');
    });

    it('should have FORCE phrase', () => {
      expect(CONFIRMATION_PHRASES.FORCE).toBe('I understand this is a destructive operation');
    });

    it('should have PRODUCTION phrase', () => {
      expect(CONFIRMATION_PHRASES.PRODUCTION).toBe('I understand this affects production');
    });
  });

  describe('isInteractive', () => {
    it('should return boolean', () => {
      const result = isInteractive();
      expect(typeof result).toBe('boolean');
    });
  });
});
