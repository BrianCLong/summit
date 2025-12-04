import { describe, it, expect, beforeEach } from 'vitest';
import { DataProfiler } from '../profiler/DataProfiler.js';
import { DiscoveredSource } from '../types.js';

describe('DataProfiler', () => {
  let profiler: DataProfiler;
  let mockSource: DiscoveredSource;

  beforeEach(() => {
    profiler = new DataProfiler({
      sampleSize: 1000,
      detectPii: true,
      inferRelationships: true,
    });

    mockSource = {
      id: 'test-source-id',
      name: 'test-source',
      type: 'database',
      connectionUri: 'postgresql://localhost/test',
      status: 'discovered',
      discoveredAt: new Date(),
      confidenceScore: 0.9,
      tags: [],
      autoIngestEnabled: false,
    };
  });

  describe('profile', () => {
    it('should profile data and return quality scores', async () => {
      const data = [
        ['name', 'email', 'age'],
        ['John Doe', 'john@example.com', 30],
        ['Jane Smith', 'jane@example.com', 25],
        ['Bob Wilson', 'bob@example.com', 35],
      ];

      const profile = await profiler.profile(mockSource, data);

      expect(profile.sourceId).toBe(mockSource.id);
      expect(profile.rowCount).toBe(3);
      expect(profile.columnCount).toBe(3);
      expect(profile.columns).toHaveLength(3);
      expect(profile.overallQuality).toBeGreaterThan(0);
    });

    it('should detect semantic types', async () => {
      const data = [
        ['email', 'phone'],
        ['john@example.com', '555-123-4567'],
        ['jane@example.com', '555-987-6543'],
      ];

      const profile = await profiler.profile(mockSource, data);

      const emailCol = profile.columns.find(c => c.name === 'email');
      expect(emailCol?.semanticType).toBe('email');
    });

    it('should detect PII fields', async () => {
      const data = [
        ['ssn', 'name'],
        ['123-45-6789', 'John Doe'],
        ['987-65-4321', 'Jane Smith'],
      ];

      const profile = await profiler.profile(mockSource, data);

      const ssnCol = profile.columns.find(c => c.name === 'ssn');
      expect(ssnCol?.piiDetected).toBe(true);
    });

    it('should calculate column quality metrics', async () => {
      const data = [
        ['name', 'age'],
        ['John', 30],
        ['Jane', null],
        ['Bob', 35],
      ];

      const profile = await profiler.profile(mockSource, data);

      const ageCol = profile.columns.find(c => c.name === 'age');
      expect(ageCol?.qualityScores.completeness).toBeLessThan(1);
      expect(ageCol?.nullCount).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      const data = [
        ['name', 'email'],
        ['John', 'john@example.com'],
      ];

      const profile = await profiler.profile(mockSource, data);
      const report = profiler.generateReport(profile);

      expect(report).toContain('# Data Profile Report');
      expect(report).toContain('name');
      expect(report).toContain('email');
    });
  });
});
