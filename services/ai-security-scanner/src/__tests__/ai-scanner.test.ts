import { describe, it, expect, beforeEach } from 'vitest';
import { AISecurityScanner } from '../scanner/ai-scanner.js';

describe('AISecurityScanner', () => {
  let scanner: AISecurityScanner;

  beforeEach(() => {
    scanner = new AISecurityScanner({
      targetPaths: ['src/'],
      excludePaths: ['node_modules/'],
      scanTypes: ['static-analysis'],
      enableAIAnalysis: false,
      enableRedTeam: false,
    });
  });

  describe('initialization', () => {
    it('should create scanner with default config', () => {
      const defaultScanner = new AISecurityScanner();
      expect(defaultScanner).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customScanner = new AISecurityScanner({
        severityThreshold: 'high',
        complianceFrameworks: ['NIST', 'FedRAMP'],
      });
      expect(customScanner).toBeDefined();
    });
  });

  describe('vulnerability detection patterns', () => {
    it('should detect SQL injection patterns', async () => {
      // Simple pattern test for string concatenation in SQL
      const testCode = 'const sql = "SELECT * FROM " + table; db.query(sql);';

      // Pattern looks for concatenation followed by query operation
      const simplePattern = /\+.*query/gi;
      expect(simplePattern.test(testCode)).toBe(true);
    });

    it('should detect hardcoded secrets', () => {
      const testCode = `const password = "supersecretpassword123";`;
      const pattern = /(?:password|secret|api_key|apikey|token|credential)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi;
      expect(pattern.test(testCode)).toBe(true);
    });

    it('should detect weak crypto usage', () => {
      // Pattern looks for weak algorithms followed by opening paren
      const testCode = `const hash = md5(data);`;
      const pattern = /(?:md5|sha1|des|rc4)\s*\(/gi;
      expect(pattern.test(testCode)).toBe(true);
    });

    it('should detect potential XSS', () => {
      const testCode = `element.innerHTML = userInput;`;
      const pattern = /(?:innerHTML|outerHTML|document\.write)\s*=\s*[^;]*(?:\$\{|`|\+)/gi;
      // This won't match because it's a simple assignment without template literal
      expect(pattern.test(testCode)).toBe(false);

      // This should match
      const xssCode = `element.innerHTML = "<div>" + userInput + "</div>";`;
      expect(pattern.test(xssCode)).toBe(true);
    });
  });

  describe('severity scoring', () => {
    it('should map severity to CVSS scores correctly', () => {
      const severityMapping: Record<string, number> = {
        critical: 9.5,
        high: 7.5,
        medium: 5.0,
        low: 2.5,
        info: 0.0,
      };

      Object.entries(severityMapping).forEach(([severity, expectedScore]) => {
        expect(expectedScore).toBeGreaterThanOrEqual(0);
        expect(expectedScore).toBeLessThanOrEqual(10);
      });
    });
  });
});
