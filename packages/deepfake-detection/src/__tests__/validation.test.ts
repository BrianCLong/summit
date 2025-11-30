import { describe, it, expect } from '@jest/globals';
import {
  validateConfidenceScore,
  validateMediaType,
  validateFileSize,
  ValidationError,
} from '../utils/validation.js';

describe('Validation utilities', () => {
  describe('validateConfidenceScore', () => {
    it('should accept valid confidence scores', () => {
      expect(() => validateConfidenceScore(0.0)).not.toThrow();
      expect(() => validateConfidenceScore(0.5)).not.toThrow();
      expect(() => validateConfidenceScore(1.0)).not.toThrow();
    });

    it('should reject confidence scores out of range', () => {
      expect(() => validateConfidenceScore(-0.1)).toThrow(ValidationError);
      expect(() => validateConfidenceScore(1.1)).toThrow(ValidationError);
    });

    it('should reject non-number values', () => {
      expect(() => validateConfidenceScore(NaN)).toThrow(ValidationError);
    });
  });

  describe('validateMediaType', () => {
    it('should accept valid media types', () => {
      expect(validateMediaType('VIDEO')).toBe(true);
      expect(validateMediaType('AUDIO')).toBe(true);
      expect(validateMediaType('IMAGE')).toBe(true);
    });

    it('should reject invalid media types', () => {
      expect(() => validateMediaType('INVALID')).toThrow(ValidationError);
    });
  });

  describe('validateFileSize', () => {
    it('should accept valid file sizes', () => {
      expect(() => validateFileSize(1000, 'IMAGE')).not.toThrow();
      expect(() => validateFileSize(1024000, 'VIDEO')).not.toThrow();
    });

    it('should reject files that are too large', () => {
      expect(() => validateFileSize(3 * 1024 * 1024 * 1024, 'VIDEO')).toThrow(
        ValidationError,
      );
    });

    it('should reject zero or negative file sizes', () => {
      expect(() => validateFileSize(0, 'IMAGE')).toThrow(ValidationError);
      expect(() => validateFileSize(-1, 'IMAGE')).toThrow(ValidationError);
    });
  });
});
