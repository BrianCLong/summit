/**
 * Tests for disclosure pack redaction script
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  loadDenylist,
  loadPatterns,
  redactContent,
  isTextFile,
} = require('../../scripts/compliance/redact-disclosure-pack.cjs');

describe('redact-disclosure-pack', () => {
  describe('loadDenylist', () => {
    it('should load denylist entries from file', () => {
      const denylistPath = path.resolve(__dirname, '../../compliance/pii-denylist.txt');
      const entries = loadDenylist(denylistPath);
      expect(Array.isArray(entries)).toBe(true);
      expect(entries).toContain('PII_SAMPLE_DO_NOT_SHIP');
      expect(entries).toContain('REDACT_THIS_VALUE');
    });

    it('should ignore comment lines', () => {
      const denylistPath = path.resolve(__dirname, '../../compliance/pii-denylist.txt');
      const entries = loadDenylist(denylistPath);
      const hasComments = entries.some((e) => e.startsWith('#'));
      expect(hasComments).toBe(false);
    });

    it('should return empty array for missing file', () => {
      const entries = loadDenylist('/nonexistent/path/denylist.txt');
      expect(entries).toEqual([]);
    });
  });

  describe('loadPatterns', () => {
    it('should load patterns from JSON file', () => {
      const patternsPath = path.resolve(__dirname, '../../compliance/secret-patterns.json');
      const patterns = loadPatterns(patternsPath);
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);

      const emailPattern = patterns.find((p) => p.name === 'email');
      expect(emailPattern).toBeDefined();
      expect(emailPattern.regex).toBeInstanceOf(RegExp);
    });

    it('should return empty array for missing file', () => {
      const patterns = loadPatterns('/nonexistent/path/patterns.json');
      expect(patterns).toEqual([]);
    });
  });

  describe('redactContent', () => {
    const denylist = ['SECRET_VALUE', 'PRIVATE_DATA'];
    const patterns = [
      {
        name: 'email',
        pattern: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
        replacement: '[REDACTED_EMAIL]',
        regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
      },
      {
        name: 'ssn',
        pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
        replacement: '[REDACTED_SSN]',
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      },
    ];

    it('should redact denylist terms', () => {
      const content = 'This contains SECRET_VALUE and PRIVATE_DATA';
      const { redacted, matches } = redactContent(content, denylist, []);
      expect(redacted).toBe('This contains [REDACTED] and [REDACTED]');
      expect(matches.length).toBe(2);
    });

    it('should redact email addresses', () => {
      const content = 'Contact: user@example.com for info';
      const { redacted, matches } = redactContent(content, [], patterns);
      expect(redacted).toBe('Contact: [REDACTED_EMAIL] for info');
      expect(matches.length).toBe(1);
      expect(matches[0].name).toBe('email');
    });

    it('should redact SSN patterns', () => {
      const content = 'SSN: 123-45-6789';
      const { redacted, matches } = redactContent(content, [], patterns);
      expect(redacted).toBe('SSN: [REDACTED_SSN]');
      expect(matches.length).toBe(1);
      expect(matches[0].name).toBe('ssn');
    });

    it('should handle multiple patterns in same content', () => {
      const content = 'Email: test@example.com, SSN: 123-45-6789';
      const { redacted, matches } = redactContent(content, [], patterns);
      expect(redacted).toBe('Email: [REDACTED_EMAIL], SSN: [REDACTED_SSN]');
      expect(matches.length).toBe(2);
    });

    it('should handle content with no matches', () => {
      const content = 'This is clean content with no secrets';
      const { redacted, matches } = redactContent(content, denylist, patterns);
      expect(redacted).toBe(content);
      expect(matches.length).toBe(0);
    });
  });

  describe('isTextFile', () => {
    it('should identify text files', () => {
      expect(isTextFile('file.md')).toBe(true);
      expect(isTextFile('file.txt')).toBe(true);
      expect(isTextFile('file.json')).toBe(true);
      expect(isTextFile('file.yaml')).toBe(true);
      expect(isTextFile('file.yml')).toBe(true);
      expect(isTextFile('file.js')).toBe(true);
      expect(isTextFile('file.ts')).toBe(true);
    });

    it('should identify binary files', () => {
      expect(isTextFile('file.png')).toBe(false);
      expect(isTextFile('file.jpg')).toBe(false);
      expect(isTextFile('file.zip')).toBe(false);
      expect(isTextFile('file.pdf')).toBe(false);
      expect(isTextFile('file.exe')).toBe(false);
    });

    it('should treat extensionless files as text', () => {
      expect(isTextFile('Makefile')).toBe(true);
      expect(isTextFile('Dockerfile')).toBe(true);
    });
  });
});
