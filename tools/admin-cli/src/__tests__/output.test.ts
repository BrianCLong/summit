/**
 * Tests for output formatting utilities
 */

import {
  setOutputFormat,
  getOutputFormat,
  formatHealthStatus,
  formatPercentage,
  formatDuration,
  formatBytes,
  formatTimestamp,
} from '../utils/output.js';

describe('Output Utilities', () => {
  describe('setOutputFormat / getOutputFormat', () => {
    it('should default to table format', () => {
      setOutputFormat('table');
      expect(getOutputFormat()).toBe('table');
    });

    it('should allow setting json format', () => {
      setOutputFormat('json');
      expect(getOutputFormat()).toBe('json');
    });

    it('should allow setting yaml format', () => {
      setOutputFormat('yaml');
      expect(getOutputFormat()).toBe('yaml');
    });
  });

  describe('formatHealthStatus', () => {
    it('should format healthy status with green color', () => {
      const result = formatHealthStatus('healthy');
      expect(result).toContain('healthy');
    });

    it('should format degraded status with yellow color', () => {
      const result = formatHealthStatus('degraded');
      expect(result).toContain('degraded');
    });

    it('should format unhealthy status with red color', () => {
      const result = formatHealthStatus('unhealthy');
      expect(result).toContain('unhealthy');
    });

    it('should format unknown status with gray color', () => {
      const result = formatHealthStatus('unknown');
      expect(result).toContain('unknown');
    });
  });

  describe('formatPercentage', () => {
    it('should format high percentage as green', () => {
      const result = formatPercentage(0.999);
      expect(result).toContain('99.90%');
    });

    it('should format medium percentage as yellow', () => {
      const result = formatPercentage(0.95);
      expect(result).toContain('95.00%');
    });

    it('should format low percentage as red', () => {
      const result = formatPercentage(0.9);
      expect(result).toContain('90.00%');
    });

    it('should handle zero', () => {
      const result = formatPercentage(0);
      expect(result).toContain('0.00%');
    });

    it('should handle 100%', () => {
      const result = formatPercentage(1);
      expect(result).toContain('100.00%');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(2500)).toBe('2.50s');
    });

    it('should format minutes', () => {
      expect(formatDuration(120000)).toBe('2.00m');
    });

    it('should format hours', () => {
      expect(formatDuration(7200000)).toBe('2.00h');
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should format terabytes', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    it('should handle decimal values', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('formatTimestamp', () => {
    it('should format ISO string', () => {
      const result = formatTimestamp('2024-01-15T10:30:00Z');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should format Date object', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatTimestamp(date);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
