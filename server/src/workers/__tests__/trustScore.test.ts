/**
 * Trust Score Worker Test Suite
 *
 * Tests for:
 * - Trust score computation algorithm
 * - Signal severity weighting
 * - Time-based decay (7-day window)
 * - Score clamping (0.0 - 1.0)
 * - Tenant-specific recomputation
 * - Database integration
 * - Metrics recording
 */

import { jest } from '@jest/globals';
import {
  computeTrustScore,
  recomputeTrustForTenant,
  type Signal,
} from '../trustScore';

// Mock dependencies
jest.mock('../db/repositories/trustRiskRepo.js', () => ({
  listRecentSignals: jest.fn(),
  upsertTrustScore: jest.fn(),
}));

jest.mock('../observability/trust-risk-metrics.js', () => ({
  recordTrustScore: jest.fn(),
}));

describe('Trust Score Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('computeTrustScore', () => {
    it('should return base score when no signals', () => {
      const base = 0.7;
      const signals: Signal[] = [];

      const score = computeTrustScore(base, signals);

      expect(score).toBe(0.7);
    });

    it('should reduce score for LOW severity signal', () => {
      const base = 0.7;
      const signals: Signal[] = [
        {
          severity: 'LOW',
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      expect(score).toBe(0.69); // 0.7 - 0.01 = 0.69
    });

    it('should reduce score for MEDIUM severity signal', () => {
      const base = 0.7;
      const signals: Signal[] = [
        {
          severity: 'MEDIUM',
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      expect(score).toBe(0.67); // 0.7 - 0.03 = 0.67
    });

    it('should reduce score for HIGH severity signal', () => {
      const base = 0.7;
      const signals: Signal[] = [
        {
          severity: 'HIGH',
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      expect(score).toBe(0.62); // 0.7 - 0.08 = 0.62
    });

    it('should reduce score for CRITICAL severity signal', () => {
      const base = 0.7;
      const signals: Signal[] = [
        {
          severity: 'CRITICAL',
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      expect(score).toBe(0.55); // 0.7 - 0.15 = 0.55
    });

    it('should handle multiple signals cumulatively', () => {
      const base = 0.9;
      const signals: Signal[] = [
        {
          severity: 'LOW',
          created_at: new Date().toISOString(),
        },
        {
          severity: 'MEDIUM',
          created_at: new Date().toISOString(),
        },
        {
          severity: 'HIGH',
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      // 0.9 - 0.01 (LOW) - 0.03 (MEDIUM) - 0.08 (HIGH) = 0.78
      expect(score).toBe(0.78);
    });

    it('should only consider signals from last 7 days', () => {
      const base = 0.7;
      const now = Date.now();
      const weekMs = 7 * 24 * 3600 * 1000;

      const signals: Signal[] = [
        {
          severity: 'CRITICAL',
          created_at: new Date(now - 1000).toISOString(), // Recent
        },
        {
          severity: 'CRITICAL',
          created_at: new Date(now - weekMs - 1000).toISOString(), // Older than 7 days
        },
      ];

      const score = computeTrustScore(base, signals);

      // Only the recent CRITICAL should count: 0.7 - 0.15 = 0.55
      expect(score).toBe(0.55);
    });

    it('should include signals exactly 7 days old', () => {
      const base = 0.8;
      const now = Date.now();
      const weekMs = 7 * 24 * 3600 * 1000;

      const signals: Signal[] = [
        {
          severity: 'HIGH',
          created_at: new Date(now - weekMs + 1000).toISOString(), // Just under 7 days
        },
      ];

      const score = computeTrustScore(base, signals);

      // Should count: 0.8 - 0.08 = 0.72
      expect(score).toBe(0.72);
    });

    it('should clamp score at minimum 0.0', () => {
      const base = 0.1;
      const signals: Signal[] = [
        { severity: 'CRITICAL', created_at: new Date().toISOString() },
        { severity: 'CRITICAL', created_at: new Date().toISOString() },
        { severity: 'CRITICAL', created_at: new Date().toISOString() },
      ];

      const score = computeTrustScore(base, signals);

      // 0.1 - 0.15 * 3 = -0.35, but should clamp to 0.0
      expect(score).toBe(0.0);
    });

    it('should clamp score at maximum 1.0', () => {
      const base = 1.5; // Invalid input, but should handle gracefully
      const signals: Signal[] = [];

      const score = computeTrustScore(base, signals);

      expect(score).toBe(1.0);
    });

    it('should handle unknown severity as default 0.02', () => {
      const base = 0.7;
      const signals: Signal[] = [
        {
          severity: 'UNKNOWN',
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      // 0.7 - 0.02 (default) = 0.68
      expect(score).toBe(0.68);
    });

    it('should handle case-insensitive severity', () => {
      const base = 0.8;
      const signals: Signal[] = [
        {
          severity: 'high', // lowercase
          created_at: new Date().toISOString(),
        },
        {
          severity: 'High', // mixed case
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      // Both should be treated as HIGH: 0.8 - 0.08 - 0.08 = 0.64
      expect(score).toBe(0.64);
    });

    it('should round score to 4 decimal places', () => {
      const base = 0.77777;
      const signals: Signal[] = [
        {
          severity: 'LOW',
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      // Should round: 0.77777 - 0.01 = 0.76777 → 0.7678
      expect(score).toBe(0.7678);
    });

    it('should handle many signals efficiently', () => {
      const base = 1.0;
      const signals: Signal[] = Array.from({ length: 100 }, () => ({
        severity: 'LOW',
        created_at: new Date().toISOString(),
      }));

      const score = computeTrustScore(base, signals);

      // 100 * 0.01 = 1.0, so 1.0 - 1.0 = 0.0
      expect(score).toBe(0.0);
    });
  });

  describe('recomputeTrustForTenant', () => {
    it('should fetch recent signals and compute score', async () => {
      const { listRecentSignals } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { upsertTrustScore } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { recordTrustScore } = await import(
        '../observability/trust-risk-metrics.js'
      );

      const mockSignals: Signal[] = [
        {
          severity: 'MEDIUM',
          created_at: new Date().toISOString(),
        },
        {
          severity: 'HIGH',
          created_at: new Date().toISOString(),
        },
      ];

      (listRecentSignals as jest.Mock).mockResolvedValue(mockSignals);
      (upsertTrustScore as jest.Mock).mockResolvedValue(undefined);
      (recordTrustScore as jest.Mock).mockReturnValue(undefined);

      await recomputeTrustForTenant('tenant-123', 'subject-456');

      expect(listRecentSignals).toHaveBeenCalledWith(
        'tenant-123',
        'subject-456',
        100,
      );

      // Expected score: 0.7 - 0.03 (MEDIUM) - 0.08 (HIGH) = 0.59
      expect(upsertTrustScore).toHaveBeenCalledWith(
        'tenant-123',
        'subject-456',
        0.59,
        ['auto_recompute'],
      );

      expect(recordTrustScore).toHaveBeenCalledWith('subject-456', 0.59);
    });

    it('should use base score of 0.7', async () => {
      const { listRecentSignals } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { upsertTrustScore } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { recordTrustScore } = await import(
        '../observability/trust-risk-metrics.js'
      );

      (listRecentSignals as jest.Mock).mockResolvedValue([]);
      (upsertTrustScore as jest.Mock).mockResolvedValue(undefined);
      (recordTrustScore as jest.Mock).mockReturnValue(undefined);

      await recomputeTrustForTenant('tenant-123', 'subject-456');

      // With no signals, should be base score 0.7
      expect(upsertTrustScore).toHaveBeenCalledWith(
        'tenant-123',
        'subject-456',
        0.7,
        ['auto_recompute'],
      );
    });

    it('should fetch up to 100 recent signals', async () => {
      const { listRecentSignals } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { upsertTrustScore } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { recordTrustScore } = await import(
        '../observability/trust-risk-metrics.js'
      );

      (listRecentSignals as jest.Mock).mockResolvedValue([]);
      (upsertTrustScore as jest.Mock).mockResolvedValue(undefined);
      (recordTrustScore as jest.Mock).mockReturnValue(undefined);

      await recomputeTrustForTenant('tenant-123', 'subject-456');

      expect(listRecentSignals).toHaveBeenCalledWith(
        'tenant-123',
        'subject-456',
        100,
      );
    });

    it('should tag upsert with auto_recompute', async () => {
      const { listRecentSignals } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { upsertTrustScore } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { recordTrustScore } = await import(
        '../observability/trust-risk-metrics.js'
      );

      (listRecentSignals as jest.Mock).mockResolvedValue([]);
      (upsertTrustScore as jest.Mock).mockResolvedValue(undefined);
      (recordTrustScore as jest.Mock).mockReturnValue(undefined);

      await recomputeTrustForTenant('tenant-123', 'subject-456');

      expect(upsertTrustScore).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        ['auto_recompute'],
      );
    });

    it('should record metrics for observability', async () => {
      const { listRecentSignals } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { upsertTrustScore } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { recordTrustScore } = await import(
        '../observability/trust-risk-metrics.js'
      );

      const mockSignals: Signal[] = [
        {
          severity: 'CRITICAL',
          created_at: new Date().toISOString(),
        },
      ];

      (listRecentSignals as jest.Mock).mockResolvedValue(mockSignals);
      (upsertTrustScore as jest.Mock).mockResolvedValue(undefined);
      (recordTrustScore as jest.Mock).mockReturnValue(undefined);

      await recomputeTrustForTenant('tenant-123', 'subject-456');

      // Expected score: 0.7 - 0.15 = 0.55
      expect(recordTrustScore).toHaveBeenCalledWith('subject-456', 0.55);
    });

    it('should handle database errors gracefully', async () => {
      const { listRecentSignals } = await import(
        '../db/repositories/trustRiskRepo.js'
      );

      (listRecentSignals as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        recomputeTrustForTenant('tenant-123', 'subject-456'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle upsert errors gracefully', async () => {
      const { listRecentSignals } = await import(
        '../db/repositories/trustRiskRepo.js'
      );
      const { upsertTrustScore } = await import(
        '../db/repositories/trustRiskRepo.js'
      );

      (listRecentSignals as jest.Mock).mockResolvedValue([]);
      (upsertTrustScore as jest.Mock).mockRejectedValue(
        new Error('Upsert failed'),
      );

      await expect(
        recomputeTrustForTenant('tenant-123', 'subject-456'),
      ).rejects.toThrow('Upsert failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty severity string', () => {
      const base = 0.7;
      const signals: Signal[] = [
        {
          severity: '',
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      // Empty severity should use default 0.02
      expect(score).toBe(0.68);
    });

    it('should handle null/undefined severity', () => {
      const base = 0.7;
      const signals: Signal[] = [
        {
          severity: null as any,
          created_at: new Date().toISOString(),
        },
        {
          severity: undefined as any,
          created_at: new Date().toISOString(),
        },
      ];

      const score = computeTrustScore(base, signals);

      // Both should use default: 0.7 - 0.02 - 0.02 = 0.66
      expect(score).toBe(0.66);
    });

    it('should handle invalid date strings', () => {
      const base = 0.7;
      const signals: Signal[] = [
        {
          severity: 'HIGH',
          created_at: 'invalid-date',
        },
      ];

      const score = computeTrustScore(base, signals);

      // Invalid date should be treated as very old (NaN > 7 days)
      // So signal should be ignored, score stays 0.7
      expect(score).toBe(0.7);
    });

    it('should handle future dates', () => {
      const base = 0.7;
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const signals: Signal[] = [
        {
          severity: 'CRITICAL',
          created_at: futureDate,
        },
      ];

      const score = computeTrustScore(base, signals);

      // Future signals should still count (age will be negative but <= 7 days in ms)
      expect(score).toBe(0.55); // 0.7 - 0.15
    });

    it('should handle base score of 0', () => {
      const base = 0.0;
      const signals: Signal[] = [];

      const score = computeTrustScore(base, signals);

      expect(score).toBe(0.0);
    });

    it('should handle base score of 1', () => {
      const base = 1.0;
      const signals: Signal[] = [];

      const score = computeTrustScore(base, signals);

      expect(score).toBe(1.0);
    });

    it('should handle negative base score', () => {
      const base = -0.5;
      const signals: Signal[] = [];

      const score = computeTrustScore(base, signals);

      // Negative base should clamp to 0.0
      expect(score).toBe(0.0);
    });
  });
});
