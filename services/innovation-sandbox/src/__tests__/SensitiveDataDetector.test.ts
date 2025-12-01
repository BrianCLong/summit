import { describe, it, expect, beforeEach } from 'vitest';
import { SensitiveDataDetector } from '../detector/SensitiveDataDetector.js';
import { SensitiveDataType } from '../types/index.js';

describe('SensitiveDataDetector', () => {
  let detector: SensitiveDataDetector;

  beforeEach(() => {
    detector = new SensitiveDataDetector();
  });

  describe('PII Detection', () => {
    it('should detect SSN format', async () => {
      const flags = await detector.scanInputs({
        ssn: '123-45-6789',
      });

      expect(flags.length).toBeGreaterThan(0);
      expect(flags.some(f => f.type === SensitiveDataType.PII)).toBe(true);
      // First flag may be field name detection (0.8) or SSN pattern (0.95)
      expect(flags.some(f => f.confidence >= 0.8)).toBe(true);
    });

    it('should detect email addresses', async () => {
      const flags = await detector.scanInputs({
        email: 'user@example.com',
      });

      expect(flags.some(f => f.type === SensitiveDataType.PII)).toBe(true);
    });

    it('should detect phone numbers', async () => {
      const flags = await detector.scanInputs({
        phone: '555-123-4567',
      });

      expect(flags.some(f => f.type === SensitiveDataType.PII)).toBe(true);
    });

    it('should detect nested sensitive data', async () => {
      const flags = await detector.scanInputs({
        user: {
          profile: {
            ssn: '987-65-4321',
          },
        },
      });

      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0].location).toContain('user.profile');
    });
  });

  describe('PCI Detection', () => {
    it('should detect credit card numbers', async () => {
      const flags = await detector.scanInputs({
        card: '4111111111111111', // Visa test number
      });

      expect(flags.some(f => f.type === SensitiveDataType.PCI)).toBe(true);
      expect(flags[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should detect Mastercard numbers', async () => {
      const flags = await detector.scanInputs({
        payment: '5500000000000004',
      });

      expect(flags.some(f => f.type === SensitiveDataType.PCI)).toBe(true);
    });
  });

  describe('Credentials Detection', () => {
    it('should detect API keys', async () => {
      const flags = await detector.scanCode(`
        const apiKey = "sk_live_1234567890abcdefghij";
      `);

      expect(flags.some(f => f.type === SensitiveDataType.CREDENTIALS)).toBe(true);
    });

    it('should detect AWS access keys', async () => {
      const flags = await detector.scanCode(`
        const key = "AKIAIOSFODNN7EXAMPLE";
      `);

      expect(flags.some(f => f.type === SensitiveDataType.CREDENTIALS)).toBe(true);
      expect(flags[0].confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('should detect private keys', async () => {
      const flags = await detector.scanCode(`
        const key = \`-----BEGIN RSA PRIVATE KEY-----
        MIIEpAIBAAKCAQEA0Z3VS
        -----END RSA PRIVATE KEY-----\`;
      `);

      expect(flags.some(f => f.type === SensitiveDataType.CREDENTIALS)).toBe(true);
    });
  });

  describe('Code Analysis', () => {
    it('should flag eval usage', async () => {
      const flags = await detector.scanCode(`
        const result = eval(userInput);
      `);

      expect(flags.length).toBeGreaterThan(0);
      expect(flags.some(f => f.recommendation.includes('Dynamic code'))).toBe(true);
    });

    it('should flag process.env access', async () => {
      const flags = await detector.scanCode(`
        const secret = process.env.SECRET_KEY;
      `);

      expect(flags.some(f => f.recommendation.includes('Environment variable'))).toBe(true);
    });

    it('should flag filesystem access', async () => {
      const flags = await detector.scanCode(`
        import fs from 'fs';
        fs.readFileSync('/etc/passwd');
      `);

      expect(flags.some(f => f.recommendation.includes('Filesystem'))).toBe(true);
    });
  });

  describe('Sensitive Field Names', () => {
    it('should flag fields with sensitive names', async () => {
      const flags = await detector.scanInputs({
        password: 'mypassword',
        salary: 75000,
        date_of_birth: '1990-01-01',
      });

      expect(flags.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Output Scanning', () => {
    it('should scan output for sensitive data', async () => {
      const flags = await detector.scanOutput({
        result: {
          ssn: '111-22-3333',
        },
      });

      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0].location).toContain('output');
    });

    it('should handle null output', async () => {
      const flags = await detector.scanOutput(null);
      expect(flags).toEqual([]);
    });
  });

  describe('Redaction', () => {
    it('should properly redact SSN', async () => {
      const flags = await detector.scanInputs({ ssn: '123-45-6789' });
      const ssnFlag = flags.find(f => f.redacted.includes('***-**-'));

      expect(ssnFlag).toBeDefined();
      expect(ssnFlag?.redacted).toBe('***-**-6789');
    });
  });

  describe('Custom Patterns', () => {
    it('should allow adding custom patterns', async () => {
      detector.addCustomPattern('CUSTOM_ID', /\bCUST-\d{6}\b/g, 0.9);

      const flags = await detector.scanInputs({
        customerId: 'CUST-123456',
      });

      expect(flags.some(f => f.location.includes('custom:CUSTOM_ID'))).toBe(true);
    });

    it('should allow removing custom patterns', () => {
      detector.addCustomPattern('TEST', /test/g, 0.5);
      expect(detector.removeCustomPattern('TEST')).toBe(true);
      expect(detector.removeCustomPattern('NONEXISTENT')).toBe(false);
    });
  });

  describe('Pattern Stats', () => {
    it('should return pattern statistics', () => {
      const stats = detector.getPatternStats();

      expect(stats.length).toBeGreaterThan(0);
      expect(stats.some(s => s.type === 'pii')).toBe(true);
      expect(stats.some(s => s.type === 'credentials')).toBe(true);
    });
  });
});
