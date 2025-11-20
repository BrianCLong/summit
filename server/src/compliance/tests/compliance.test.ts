
import { ComplianceManager } from '../compliance-manager.js';
import { AdvancedAuditSystem } from '../../audit/advanced-audit-system.js';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { jest } from '@jest/globals';

// Mock dependencies
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

const mockRedis = {
  publish: jest.fn(),
} as unknown as Redis;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

const mockAuditSystem = {
  generateComplianceReport: jest.fn(),
  recordEvent: jest.fn(),
} as unknown as AdvancedAuditSystem;

describe('ComplianceManager', () => {
  let complianceManager: ComplianceManager;

  beforeEach(() => {
    jest.clearAllMocks();
    complianceManager = new ComplianceManager(
      mockAuditSystem,
      mockPool,
      mockRedis,
      mockLogger
    );
  });

  it('should check compliance status using existing report', async () => {
    const mockReport = {
      framework: 'GDPR',
      period: { start: new Date(), end: new Date() },
      summary: {
        totalEvents: 100,
        criticalEvents: 0,
        violations: [],
        complianceScore: 98
      },
      violations: [],
      recommendations: []
    };

    (mockPool.query as any).mockResolvedValueOnce({ rows: [{ report_data: mockReport }] });

    const status = await complianceManager.checkComplianceStatus('GDPR');

    expect(status.status).toBe('compliant');
    expect(status.score).toBe(98);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('should generate new report if none exists', async () => {
    (mockPool.query as any).mockResolvedValueOnce({ rows: [] });

    const mockReport = {
      framework: 'GDPR',
      period: { start: new Date(), end: new Date() },
      summary: {
        totalEvents: 100,
        criticalEvents: 2,
        violations: [{ severity: 'critical' }],
        complianceScore: 70
      },
      violations: [{ severity: 'critical' }],
      recommendations: []
    };

    (mockAuditSystem.generateComplianceReport as any).mockResolvedValueOnce(mockReport);

    const status = await complianceManager.checkComplianceStatus('GDPR');

    expect(status.status).toBe('non_compliant'); // score 70 + critical violation
    expect(mockAuditSystem.generateComplianceReport).toHaveBeenCalled();
  });
});
