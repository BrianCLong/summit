/**
 * Detection Engine Tests
 * @package dlp-core
 */

import { DetectionEngine } from '../src/DetectionEngine';

describe('DetectionEngine', () => {
  let engine: DetectionEngine;

  beforeEach(() => {
    engine = new DetectionEngine();
  });

  describe('SSN Detection', () => {
    it('should detect SSN with dashes', async () => {
      const result = await engine.detect('My SSN is 123-45-6789');
      expect(result.hasDetections).toBe(true);
      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].type).toBe('SSN');
      expect(result.detections[0].matchedValue).toBe('123-45-6789');
    });

    it('should detect SSN without dashes', async () => {
      const result = await engine.detect('SSN: 123456789');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('SSN');
    });

    it('should not detect invalid SSN starting with 000', async () => {
      const result = await engine.detect('Number is 000-12-3456');
      const ssnDetections = result.detections.filter((d) => d.type === 'SSN');
      expect(ssnDetections).toHaveLength(0);
    });

    it('should not detect invalid SSN starting with 666', async () => {
      const result = await engine.detect('Number is 666-12-3456');
      const ssnDetections = result.detections.filter((d) => d.type === 'SSN');
      expect(ssnDetections).toHaveLength(0);
    });

    it('should boost confidence when context keywords present', async () => {
      const withContext = await engine.detect('Social Security Number: 123-45-6789');
      const withoutContext = await engine.detect('Random number 123-45-6789');

      expect(withContext.detections[0].confidence).toBeGreaterThan(
        withoutContext.detections[0].confidence
      );
    });
  });

  describe('Credit Card Detection', () => {
    it('should detect Visa card', async () => {
      const result = await engine.detect('Card: 4111111111111111');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('CREDIT_CARD');
    });

    it('should detect Mastercard', async () => {
      const result = await engine.detect('Card: 5555555555554444');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('CREDIT_CARD');
    });

    it('should detect Amex', async () => {
      const result = await engine.detect('Card: 378282246310005');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('CREDIT_CARD');
    });

    it('should not detect invalid card (fails Luhn)', async () => {
      const result = await engine.detect('Card: 4111111111111112');
      const ccDetections = result.detections.filter((d) => d.type === 'CREDIT_CARD');
      expect(ccDetections).toHaveLength(0);
    });
  });

  describe('Email Detection', () => {
    it('should detect standard email', async () => {
      const result = await engine.detect('Contact: user@example.com');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('EMAIL');
      expect(result.detections[0].matchedValue).toBe('user@example.com');
    });

    it('should detect email with subdomain', async () => {
      const result = await engine.detect('Email: admin@mail.company.co.uk');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('EMAIL');
    });

    it('should detect email with plus addressing', async () => {
      const result = await engine.detect('Email: user+tag@example.com');
      expect(result.hasDetections).toBe(true);
    });
  });

  describe('Phone Detection', () => {
    it('should detect US phone with dashes', async () => {
      const result = await engine.detect('Call: 555-123-4567');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('PHONE');
    });

    it('should detect US phone with parentheses', async () => {
      const result = await engine.detect('Phone: (555) 123-4567');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('PHONE');
    });

    it('should detect US phone with country code', async () => {
      const result = await engine.detect('Number: +1-555-123-4567');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('PHONE');
    });
  });

  describe('API Key Detection', () => {
    it('should detect AWS access key', async () => {
      const result = await engine.detect('Key: AKIAIOSFODNN7EXAMPLE');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('API_KEY');
    });

    it('should detect OpenAI API key', async () => {
      const result = await engine.detect('API_KEY=sk-1234567890abcdefghijklmnopqrstuv');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('API_KEY');
    });

    it('should detect GitHub PAT', async () => {
      const result = await engine.detect('token: ghp_1234567890abcdefghijklmnopqrstuvwxyz');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('API_KEY');
    });

    it('should detect Slack token', async () => {
      const result = await engine.detect('SLACK_TOKEN=xoxb-123456789-abcdefghij');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('API_KEY');
    });
  });

  describe('IP Address Detection', () => {
    it('should detect valid IPv4', async () => {
      const result = await engine.detect('Server IP: 192.168.1.100');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].type).toBe('IP_ADDRESS');
    });

    it('should not detect invalid IP (octet > 255)', async () => {
      const result = await engine.detect('Not an IP: 256.168.1.100');
      const ipDetections = result.detections.filter((d) => d.type === 'IP_ADDRESS');
      expect(ipDetections).toHaveLength(0);
    });
  });

  describe('Multiple Detections', () => {
    it('should detect multiple patterns in same content', async () => {
      const content = `
        Contact Information:
        Email: john.doe@example.com
        Phone: (555) 123-4567
        SSN: 123-45-6789
      `;

      const result = await engine.detect(content);
      expect(result.hasDetections).toBe(true);
      expect(result.detections.length).toBeGreaterThanOrEqual(3);

      const types = result.detections.map((d) => d.type);
      expect(types).toContain('EMAIL');
      expect(types).toContain('PHONE');
      expect(types).toContain('SSN');
    });

    it('should calculate correct classification for multiple types', async () => {
      const content = 'SSN: 123-45-6789, Email: test@example.com';
      const result = await engine.detect(content);

      // SSN should elevate to RESTRICTED
      expect(result.classification).toBe('RESTRICTED');
    });

    it('should calculate highest risk score', async () => {
      const content = 'SSN: 123-45-6789, Email: test@example.com';
      const result = await engine.detect(content);

      // SSN has risk score 95
      expect(result.riskScore).toBe(95);
    });
  });

  describe('Classification', () => {
    it('should classify email as INTERNAL', async () => {
      const result = await engine.detect('Email: user@example.com');
      expect(result.classification).toBe('INTERNAL');
    });

    it('should classify SSN as RESTRICTED', async () => {
      const result = await engine.detect('SSN: 123-45-6789');
      expect(result.classification).toBe('RESTRICTED');
    });

    it('should classify credit card as RESTRICTED', async () => {
      const result = await engine.detect('Card: 4111111111111111');
      expect(result.classification).toBe('RESTRICTED');
    });

    it('should classify API key as RESTRICTED', async () => {
      const result = await engine.detect('Key: AKIAIOSFODNN7EXAMPLE');
      expect(result.classification).toBe('RESTRICTED');
    });
  });

  describe('Categories', () => {
    it('should include PII category for email', async () => {
      const result = await engine.detect('Email: user@example.com');
      expect(result.categories).toContain('PII');
    });

    it('should include PCI category for credit card', async () => {
      const result = await engine.detect('Card: 4111111111111111');
      expect(result.categories).toContain('PCI');
      expect(result.categories).toContain('FINANCIAL');
    });

    it('should include TRADE_SECRET for API key', async () => {
      const result = await engine.detect('Key: AKIAIOSFODNN7EXAMPLE');
      expect(result.categories).toContain('TRADE_SECRET');
    });
  });

  describe('Custom Patterns', () => {
    it('should allow adding custom patterns', async () => {
      engine.addPattern({
        name: 'Project Code',
        type: 'CUSTOM',
        regex: 'PROJ-[A-Z]{3}-[0-9]{4}',
        confidence: 0.9,
      });

      const result = await engine.detect('Project: PROJ-ABC-1234');
      expect(result.hasDetections).toBe(true);
      expect(result.detections[0].pattern).toBe('Project Code');
    });
  });

  describe('Fingerprinting', () => {
    it('should generate consistent fingerprint for same content', () => {
      const content = 'This is a test document with some content.';
      const fp1 = engine.generateFingerprint(content);
      const fp2 = engine.generateFingerprint(content);
      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprint for different content', () => {
      const fp1 = engine.generateFingerprint('Document A');
      const fp2 = engine.generateFingerprint('Document B');
      expect(fp1).not.toBe(fp2);
    });

    it('should normalize whitespace for fingerprinting', () => {
      const fp1 = engine.generateFingerprint('Hello   World');
      const fp2 = engine.generateFingerprint('Hello World');
      expect(fp1).toBe(fp2);
    });
  });

  describe('Performance', () => {
    it('should handle large content within time limit', async () => {
      const largeContent = 'Email: test@example.com\n'.repeat(10000);
      const start = Date.now();

      const result = await engine.detect(largeContent);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.hasDetections).toBe(true);
    });

    it('should respect maxDetections limit', async () => {
      const limitedEngine = new DetectionEngine({ maxDetections: 5 });
      const content = 'test@example.com '.repeat(100);

      const result = await limitedEngine.detect(content);
      expect(result.detections.length).toBeLessThanOrEqual(5);
    });
  });
});
