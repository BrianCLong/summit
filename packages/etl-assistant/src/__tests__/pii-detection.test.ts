/**
 * PII Detection Tests
 */

import { PIIDetection } from '../pii-detection';
import type { SampleRecord } from '../types';

describe('PIIDetection', () => {
  let detection: PIIDetection;

  beforeEach(() => {
    detection = new PIIDetection();
  });

  describe('detectPII', () => {
    it('should detect email addresses', () => {
      const samples: SampleRecord[] = [
        { email: 'user@example.com' },
        { email: 'another@test.com' },
      ];

      const result = detection.detectPII(samples);

      expect(result.piiFields).toBeDefined();
      const emailField = result.piiFields.find((f) => f.field === 'email');
      expect(emailField).toBeDefined();
      expect(emailField?.piiType).toBe('email');
      expect(emailField?.confidence).toBeGreaterThan(0);
    });

    it('should detect phone numbers', () => {
      const samples: SampleRecord[] = [
        { phone: '555-123-4567' },
        { phone: '555-987-6543' },
      ];

      const result = detection.detectPII(samples);

      const phoneField = result.piiFields.find((f) => f.field === 'phone');
      expect(phoneField).toBeDefined();
      expect(phoneField?.piiType).toBe('phone');
    });

    it('should detect SSN patterns', () => {
      const samples: SampleRecord[] = [
        { ssn: '123-45-6789' },
        { ssn: '987-65-4321' },
      ];

      const result = detection.detectPII(samples);

      const ssnField = result.piiFields.find((f) => f.field === 'ssn');
      expect(ssnField).toBeDefined();
      expect(ssnField?.piiType).toBe('ssn');
      expect(ssnField?.recommendedStrategy).toBe('DROP');
    });

    it('should detect credit card patterns', () => {
      const samples: SampleRecord[] = [
        { cc: '4111-1111-1111-1111' },
        { cc: '5500-0000-0000-0004' },
      ];

      const result = detection.detectPII(samples);

      const ccField = result.piiFields.find((f) => f.field === 'cc');
      expect(ccField).toBeDefined();
      expect(ccField?.piiType).toBe('credit_card');
      expect(ccField?.recommendedStrategy).toBe('DROP');
    });

    it('should calculate risk level correctly', () => {
      const highRiskSamples: SampleRecord[] = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          ssn: '123-45-6789',
          phone: '555-1234',
        },
      ];

      const result = detection.detectPII(highRiskSamples);

      expect(result.riskLevel).toBe('critical');
      expect(result.piiFields.length).toBeGreaterThan(0);
    });

    it('should return no PII for clean data', () => {
      const samples: SampleRecord[] = [
        { product: 'Widget', quantity: 5 },
        { product: 'Gadget', quantity: 3 },
      ];

      const result = detection.detectPII(samples);

      expect(result.riskLevel).toBe('none');
      expect(result.piiFields).toHaveLength(0);
    });

    it('should provide redaction recommendations', () => {
      const samples: SampleRecord[] = [
        { email: 'user@example.com' },
      ];

      const result = detection.detectPII(samples);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);

      const emailRec = result.recommendations.find((r) => r.field === 'email');
      expect(emailRec?.strategy).toBe('MASK');
    });
  });

  describe('redact', () => {
    it('should mask email addresses', () => {
      const email = 'john.doe@example.com';
      const redacted = PIIDetection.redact(email, 'MASK');

      expect(redacted).toContain('*');
      expect(redacted).not.toBe(email);
      expect(redacted).toContain('@');
    });

    it('should drop values', () => {
      const value = 'sensitive-data';
      const redacted = PIIDetection.redact(value, 'DROP');

      expect(redacted).toBe('[REDACTED]');
    });

    it('should hash values', () => {
      const value = 'sensitive-data';
      const redacted = PIIDetection.redact(value, 'HASH');

      expect(redacted).toContain('HASH_');
      expect(redacted).not.toBe(value);
    });
  });
});
