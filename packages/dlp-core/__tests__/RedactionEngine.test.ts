/**
 * Redaction Engine Tests
 * @package dlp-core
 */

import { RedactionEngine } from '../src/RedactionEngine';
import type { DetectedPattern } from '../src/types';

describe('RedactionEngine', () => {
  let engine: RedactionEngine;

  beforeEach(() => {
    engine = new RedactionEngine();
  });

  describe('Full Mask Strategy', () => {
    it('should fully mask SSN', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'SSN',
          pattern: 'SSN',
          confidence: 0.95,
          location: { start: 8, end: 19 },
          matchedValue: '123-45-6789',
        },
      ];

      const result = engine.redact({
        content: 'My SSN: 123-45-6789',
        detections,
      });

      expect(result.redactedContent).toBe('My SSN: XXX-XX-XXXX');
      expect(result.redactedFields).toHaveLength(1);
      expect(result.redactedFields[0].strategy).toBe('FULL_MASK');
    });

    it('should preserve format when configured', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'SSN',
          pattern: 'SSN',
          confidence: 0.95,
          location: { start: 0, end: 11 },
          matchedValue: '123-45-6789',
        },
      ];

      const result = engine.redact({
        content: '123-45-6789',
        detections,
        configs: {
          SSN: { strategy: 'FULL_MASK', maskChar: 'X', preserveFormat: true },
        },
      });

      expect(result.redactedContent).toBe('XXX-XX-XXXX');
    });
  });

  describe('Partial Mask Strategy', () => {
    it('should mask credit card preserving last 4', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'CREDIT_CARD',
          pattern: 'Credit Card',
          confidence: 0.98,
          location: { start: 6, end: 22 },
          matchedValue: '4111111111111111',
        },
      ];

      const result = engine.redact({
        content: 'Card: 4111111111111111',
        detections,
      });

      expect(result.redactedContent).toContain('1111');
      expect(result.redactedContent).toContain('*');
    });

    it('should mask email preserving domain', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'EMAIL',
          pattern: 'Email',
          confidence: 0.99,
          location: { start: 7, end: 23 },
          matchedValue: 'john@example.com',
        },
      ];

      const result = engine.redact({
        content: 'Email: john@example.com',
        detections,
      });

      expect(result.redactedContent).toContain('@example.com');
      expect(result.redactedContent).toContain('j');
      expect(result.redactedContent).toContain('*');
    });

    it('should mask phone preserving area code', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'PHONE',
          pattern: 'Phone',
          confidence: 0.85,
          location: { start: 7, end: 21 },
          matchedValue: '(555) 123-4567',
        },
      ];

      const result = engine.redact({
        content: 'Phone: (555) 123-4567',
        detections,
      });

      expect(result.redactedContent).toContain('555');
      expect(result.redactedContent).toContain('*');
    });
  });

  describe('Multiple Detections', () => {
    it('should redact multiple detections in correct positions', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'EMAIL',
          pattern: 'Email',
          confidence: 0.99,
          location: { start: 7, end: 23 },
          matchedValue: 'john@example.com',
        },
        {
          type: 'PHONE',
          pattern: 'Phone',
          confidence: 0.85,
          location: { start: 32, end: 44 },
          matchedValue: '555-123-4567',
        },
      ];

      const result = engine.redact({
        content: 'Email: john@example.com, Phone: 555-123-4567',
        detections,
      });

      expect(result.redactedFields).toHaveLength(2);
      // Check that both types were processed
      expect(result.redactedContent).toContain('@example.com'); // Email domain preserved
      expect(result.redactedContent).toContain('555'); // Area code preserved
    });

    it('should handle overlapping detections', () => {
      const content = 'SSN: 123-45-6789';
      const detections: DetectedPattern[] = [
        {
          type: 'SSN',
          pattern: 'SSN',
          confidence: 0.95,
          location: { start: 5, end: 16 },
          matchedValue: '123-45-6789',
        },
      ];

      const result = engine.redact({ content, detections });
      expect(result.redactedContent).not.toContain('123-45-6789');
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom mask character', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'SSN',
          pattern: 'SSN',
          confidence: 0.95,
          location: { start: 0, end: 11 },
          matchedValue: '123-45-6789',
        },
      ];

      const result = engine.redact({
        content: '123-45-6789',
        detections,
        configs: {
          SSN: { strategy: 'FULL_MASK', maskChar: '#', preserveFormat: true },
        },
      });

      expect(result.redactedContent).toBe('###-##-####');
    });

    it('should use word-based mask', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'PHI',
          pattern: 'PHI',
          confidence: 0.9,
          location: { start: 11, end: 19 },
          matchedValue: 'diabetes',
        },
      ];

      const result = engine.redact({
        content: 'Diagnosis: diabetes',
        detections,
        configs: {
          PHI: { strategy: 'FULL_MASK', maskChar: '[REDACTED]' },
        },
      });

      expect(result.redactedContent).toBe('Diagnosis: [REDACTED]');
    });
  });

  describe('Tokenization', () => {
    it('should tokenize value', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'SSN',
          pattern: 'SSN',
          confidence: 0.95,
          location: { start: 0, end: 11 },
          matchedValue: '123-45-6789',
        },
      ];

      const result = engine.redact({
        content: '123-45-6789',
        detections,
        configs: {
          SSN: { strategy: 'TOKENIZE', tokenPrefix: 'SSN' },
        },
      });

      expect(result.redactedContent).toMatch(/SSN_[a-f0-9]+/);
    });

    it('should allow detokenization', () => {
      const tokenEngine = new RedactionEngine({ deterministicMode: true });

      const detections: DetectedPattern[] = [
        {
          type: 'SSN',
          pattern: 'SSN',
          confidence: 0.95,
          location: { start: 0, end: 11 },
          matchedValue: '123-45-6789',
        },
      ];

      const result = tokenEngine.redact({
        content: '123-45-6789',
        detections,
        configs: {
          SSN: { strategy: 'TOKENIZE' },
        },
      });

      const token = result.redactedContent;
      const original = tokenEngine.detokenize(token);

      expect(original).toBe('123-45-6789');
    });

    it('should generate deterministic tokens in deterministic mode', () => {
      const tokenEngine = new RedactionEngine({ deterministicMode: true });

      const detections: DetectedPattern[] = [
        {
          type: 'SSN',
          pattern: 'SSN',
          confidence: 0.95,
          location: { start: 0, end: 11 },
          matchedValue: '123-45-6789',
        },
      ];

      const result1 = tokenEngine.redact({
        content: '123-45-6789',
        detections,
        configs: { SSN: { strategy: 'TOKENIZE' } },
      });

      tokenEngine.clearTokens();

      const result2 = tokenEngine.redact({
        content: '123-45-6789',
        detections,
        configs: { SSN: { strategy: 'TOKENIZE' } },
      });

      expect(result1.redactedContent).toBe(result2.redactedContent);
    });
  });

  describe('Remove Strategy', () => {
    it('should completely remove value', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'BIOMETRIC',
          pattern: 'Biometric',
          confidence: 0.9,
          location: { start: 12, end: 32 },
          matchedValue: 'fingerprint_data_xyz',
        },
      ];

      const result = engine.redact({
        content: 'Biometric: fingerprint_data_xyz',
        detections,
        configs: {
          BIOMETRIC: { strategy: 'REMOVE' },
        },
      });

      expect(result.redactedContent).toBe('Biometric: ');
    });
  });

  describe('Generalization Strategy', () => {
    it('should generalize date of birth to year only', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'DATE_OF_BIRTH',
          pattern: 'DOB',
          confidence: 0.8,
          location: { start: 5, end: 15 },
          matchedValue: '12/31/1990',
        },
      ];

      const result = engine.redact({
        content: 'DOB: 12/31/1990',
        detections,
      });

      expect(result.redactedContent).toContain('1990');
      expect(result.redactedContent).toContain('*');
    });

    it('should generalize IP to first two octets', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'IP_ADDRESS',
          pattern: 'IP',
          confidence: 0.9,
          location: { start: 4, end: 17 },
          matchedValue: '192.168.1.100',
        },
      ];

      const result = engine.redact({
        content: 'IP: 192.168.1.100',
        detections,
        configs: {
          IP_ADDRESS: { strategy: 'GENERALIZE' },
        },
      });

      expect(result.redactedContent).toContain('192.168');
      expect(result.redactedContent).toContain('*');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const result = engine.redact({
        content: '',
        detections: [],
      });

      expect(result.redactedContent).toBe('');
      expect(result.redactedFields).toHaveLength(0);
    });

    it('should handle no detections', () => {
      const result = engine.redact({
        content: 'Just some regular text',
        detections: [],
      });

      expect(result.redactedContent).toBe('Just some regular text');
      expect(result.redactedFields).toHaveLength(0);
    });

    it('should handle detection at start of content', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'EMAIL',
          pattern: 'Email',
          confidence: 0.99,
          location: { start: 0, end: 16 },
          matchedValue: 'test@example.com',
        },
      ];

      const result = engine.redact({
        content: 'test@example.com is my email',
        detections,
      });

      expect(result.redactedContent).toContain('@example.com');
    });

    it('should handle detection at end of content', () => {
      const detections: DetectedPattern[] = [
        {
          type: 'EMAIL',
          pattern: 'Email',
          confidence: 0.99,
          location: { start: 10, end: 26 },
          matchedValue: 'test@example.com',
        },
      ];

      const result = engine.redact({
        content: 'Contact: test@example.com',
        detections,
      });

      expect(result.redactedContent).toContain('@example.com');
    });
  });

  describe('Token Management', () => {
    it('should track token count', () => {
      const tokenEngine = new RedactionEngine();

      expect(tokenEngine.getTokenCount()).toBe(0);

      const detections: DetectedPattern[] = [
        {
          type: 'SSN',
          pattern: 'SSN',
          confidence: 0.95,
          location: { start: 0, end: 11 },
          matchedValue: '123-45-6789',
        },
      ];

      tokenEngine.redact({
        content: '123-45-6789',
        detections,
        configs: { SSN: { strategy: 'TOKENIZE' } },
      });

      expect(tokenEngine.getTokenCount()).toBe(1);
    });

    it('should clear tokens', () => {
      const tokenEngine = new RedactionEngine();

      const detections: DetectedPattern[] = [
        {
          type: 'SSN',
          pattern: 'SSN',
          confidence: 0.95,
          location: { start: 0, end: 11 },
          matchedValue: '123-45-6789',
        },
      ];

      tokenEngine.redact({
        content: '123-45-6789',
        detections,
        configs: { SSN: { strategy: 'TOKENIZE' } },
      });

      tokenEngine.clearTokens();
      expect(tokenEngine.getTokenCount()).toBe(0);
    });
  });
});
