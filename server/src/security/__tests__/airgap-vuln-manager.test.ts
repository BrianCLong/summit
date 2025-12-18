/**
 * Air-Gap Vulnerability Manager Tests
 * @module server/src/security/__tests__/airgap-vuln-manager.test
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
}));

import {
  AirGapVulnManager,
  getAirGapVulnManager,
  initializeAirGapVulnManager,
  type VulnerabilityEntry,
  type SBOMEntry,
  type ScanHistoryEntry,
} from '../airgap-vuln-manager.js';

describe('AirGapVulnManager', () => {
  let manager: AirGapVulnManager;

  const mockVulnerabilities: VulnerabilityEntry[] = [
    {
      id: 'CVE-2025-1234',
      source: 'nvd',
      severity: 'critical',
      cvssScore: 9.8,
      title: 'Critical RCE',
      description: 'Remote code execution vulnerability',
      affectedPackages: ['test-pkg'],
      fixedVersions: { 'test-pkg': '2.0.0' },
      publishedDate: '2025-01-01T00:00:00Z',
      lastModifiedDate: '2025-01-10T00:00:00Z',
      references: ['https://nvd.nist.gov/CVE-2025-1234'],
      exploitAvailable: true,
      cisaKev: true,
    },
    {
      id: 'CVE-2025-5678',
      source: 'nvd',
      severity: 'high',
      cvssScore: 7.5,
      title: 'SQL Injection',
      description: 'SQL injection in query builder',
      affectedPackages: ['sql-lib'],
      fixedVersions: { 'sql-lib': '1.5.0' },
      publishedDate: '2025-01-05T00:00:00Z',
      lastModifiedDate: '2025-01-08T00:00:00Z',
      references: [],
      exploitAvailable: false,
      cisaKev: false,
    },
  ];

  const mockSBOMs: SBOMEntry[] = [
    {
      id: 'sbom-1',
      name: 'test-app',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      componentCount: 100,
      digest: 'sha256:abc123',
      signatureValid: true,
      attestationId: 'att-1',
      vulnerabilities: {
        critical: 1,
        high: 2,
        medium: 5,
        low: 3,
      },
    },
  ];

  const mockScans: ScanHistoryEntry[] = [
    {
      id: 'scan-1',
      timestamp: new Date().toISOString(),
      target: 'test-app:latest',
      targetType: 'image',
      scanner: 'trivy',
      status: 'success',
      duration: 30000,
      summary: {
        total: 11,
        critical: 1,
        high: 2,
        medium: 5,
        low: 3,
        fixable: 8,
      },
      policyPassed: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new AirGapVulnManager({
      dataDir: '/tmp/test-vuln-data',
    });

    // Setup default mocks
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should initialize successfully with existing data', async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockVulnerabilities))
        .mockResolvedValueOnce(JSON.stringify(mockSBOMs))
        .mockResolvedValueOnce(JSON.stringify(mockScans));

      await manager.initialize();

      const health = manager.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details.vulnerabilityCount).toBe(2);
      expect(health.details.sbomCount).toBe(1);
    });

    it('should initialize with empty data when files do not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      await manager.initialize();

      const health = manager.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details.vulnerabilityCount).toBe(0);
    });

    it('should throw on non-ENOENT errors', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(manager.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('vulnerability management', () => {
    beforeEach(async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockVulnerabilities))
        .mockResolvedValueOnce(JSON.stringify([]))
        .mockResolvedValueOnce(JSON.stringify([]));

      await manager.initialize();
    });

    it('should get vulnerability by ID', () => {
      const vuln = manager.getVulnerability('CVE-2025-1234');
      expect(vuln).toBeDefined();
      expect(vuln?.severity).toBe('critical');
    });

    it('should return undefined for non-existent vulnerability', () => {
      const vuln = manager.getVulnerability('CVE-NONEXISTENT');
      expect(vuln).toBeUndefined();
    });

    it('should search vulnerabilities by severity', () => {
      const results = manager.searchVulnerabilities({ severity: ['critical'] });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('CVE-2025-1234');
    });

    it('should search vulnerabilities by package', () => {
      const results = manager.searchVulnerabilities({ package: 'sql' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('CVE-2025-5678');
    });

    it('should filter by exploit availability', () => {
      const results = manager.searchVulnerabilities({ hasExploit: true });
      expect(results).toHaveLength(1);
      expect(results[0].exploitAvailable).toBe(true);
    });

    it('should filter by CISA KEV', () => {
      const results = manager.searchVulnerabilities({ cisaKev: true });
      expect(results).toHaveLength(1);
      expect(results[0].cisaKev).toBe(true);
    });

    it('should respect limit parameter', () => {
      const results = manager.searchVulnerabilities({ limit: 1 });
      expect(results).toHaveLength(1);
    });

    it('should import new vulnerabilities', async () => {
      const newVuln: VulnerabilityEntry = {
        id: 'CVE-2025-9999',
        source: 'nvd',
        severity: 'medium',
        title: 'New Vuln',
        description: 'Test',
        affectedPackages: ['new-pkg'],
        fixedVersions: {},
        publishedDate: '2025-01-15T00:00:00Z',
        lastModifiedDate: '2025-01-15T00:00:00Z',
        references: [],
      };

      const imported = await manager.importVulnerabilities([newVuln]);

      expect(imported).toBe(1);
      expect(manager.getVulnerability('CVE-2025-9999')).toBeDefined();
    });

    it('should update existing vulnerability if newer', async () => {
      const updatedVuln: VulnerabilityEntry = {
        ...mockVulnerabilities[0],
        lastModifiedDate: '2025-01-20T00:00:00Z',
        description: 'Updated description',
      };

      const imported = await manager.importVulnerabilities([updatedVuln]);

      expect(imported).toBe(1);
      expect(manager.getVulnerability('CVE-2025-1234')?.description).toBe('Updated description');
    });

    it('should not update if existing is newer', async () => {
      const olderVuln: VulnerabilityEntry = {
        ...mockVulnerabilities[0],
        lastModifiedDate: '2024-12-01T00:00:00Z',
        description: 'Older description',
      };

      const imported = await manager.importVulnerabilities([olderVuln]);

      expect(imported).toBe(0);
      expect(manager.getVulnerability('CVE-2025-1234')?.description).toBe(
        'Remote code execution vulnerability'
      );
    });
  });

  describe('SBOM management', () => {
    beforeEach(async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([]))
        .mockResolvedValueOnce(JSON.stringify(mockSBOMs))
        .mockResolvedValueOnce(JSON.stringify([]));

      await manager.initialize();
    });

    it('should get SBOM by ID', () => {
      const sbom = manager.getSBOM('sbom-1');
      expect(sbom).toBeDefined();
      expect(sbom?.name).toBe('test-app');
    });

    it('should get all SBOMs sorted by timestamp', () => {
      const sboms = manager.getAllSBOMs();
      expect(sboms).toHaveLength(1);
    });

    it('should record new SBOM', async () => {
      const newSBOM: SBOMEntry = {
        id: 'sbom-2',
        name: 'new-app',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        componentCount: 50,
        digest: 'sha256:def456',
        vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
      };

      await manager.recordSBOM(newSBOM);

      expect(manager.getSBOM('sbom-2')).toBeDefined();
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('scan history', () => {
    beforeEach(async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([]))
        .mockResolvedValueOnce(JSON.stringify([]))
        .mockResolvedValueOnce(JSON.stringify(mockScans));

      await manager.initialize();
    });

    it('should get recent scans', () => {
      const scans = manager.getRecentScans(10);
      expect(scans).toHaveLength(1);
    });

    it('should record new scan', async () => {
      const newScan: ScanHistoryEntry = {
        id: 'scan-2',
        timestamp: new Date().toISOString(),
        target: 'another-app:v2',
        targetType: 'image',
        scanner: 'trivy',
        status: 'success',
        duration: 25000,
        summary: { total: 5, critical: 0, high: 1, medium: 2, low: 2, fixable: 4 },
        policyPassed: true,
      };

      await manager.recordScan(newScan);

      const scans = manager.getRecentScans(10);
      expect(scans).toHaveLength(2);
      expect(scans[0].id).toBe('scan-2'); // Most recent first
    });

    it('should limit scan history size', async () => {
      const limitedManager = new AirGapVulnManager({
        dataDir: '/tmp/test',
        maxHistoryEntries: 2,
      });

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([]))
        .mockResolvedValueOnce(JSON.stringify([]))
        .mockResolvedValueOnce(JSON.stringify([]));

      await limitedManager.initialize();

      // Add 3 scans
      for (let i = 0; i < 3; i++) {
        await limitedManager.recordScan({
          id: `scan-${i}`,
          timestamp: new Date().toISOString(),
          target: 'test',
          targetType: 'image',
          scanner: 'trivy',
          status: 'success',
          duration: 1000,
          summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, fixable: 0 },
          policyPassed: true,
        });
      }

      const scans = limitedManager.getRecentScans(10);
      expect(scans.length).toBeLessThanOrEqual(2);
    });
  });

  describe('dashboard data', () => {
    beforeEach(async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockVulnerabilities))
        .mockResolvedValueOnce(JSON.stringify(mockSBOMs))
        .mockResolvedValueOnce(JSON.stringify(mockScans));

      await manager.initialize();
    });

    it('should generate complete dashboard data', async () => {
      const data = await manager.getDashboardData();

      expect(data.summary).toBeDefined();
      expect(data.summary.totalVulnerabilities).toBe(2);
      expect(data.summary.criticalCount).toBe(1);
      expect(data.summary.sbomCount).toBe(1);
      expect(data.recentScans).toHaveLength(1);
      expect(data.sboms).toHaveLength(1);
      expect(data.topVulnerabilities.length).toBeGreaterThan(0);
      expect(data.trendData).toBeDefined();
    });

    it('should calculate policy pass rate', async () => {
      const data = await manager.getDashboardData();

      // One scan that failed policy
      expect(data.summary.policyPassRate).toBe(0);
    });

    it('should include trend data for last 30 days', async () => {
      const data = await manager.getDashboardData();

      expect(data.trendData.length).toBeLessThanOrEqual(30);
      data.trendData.forEach((point) => {
        expect(point.date).toBeDefined();
        expect(typeof point.critical).toBe('number');
        expect(typeof point.high).toBe('number');
      });
    });
  });

  describe('compliance report', () => {
    beforeEach(async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockVulnerabilities))
        .mockResolvedValueOnce(JSON.stringify(mockSBOMs))
        .mockResolvedValueOnce(JSON.stringify(mockScans));

      await manager.initialize();
    });

    it('should generate compliance report', async () => {
      const report = await manager.generateComplianceReport();

      expect(report.generatedAt).toBeDefined();
      expect(report.period.start).toBeDefined();
      expect(report.period.end).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should include actionable recommendations', async () => {
      const report = await manager.generateComplianceReport();

      // Should recommend addressing critical vulns
      expect(report.recommendations.some((r) => r.toLowerCase().includes('critical'))).toBe(true);
    });
  });

  describe('health check', () => {
    it('should return unhealthy when not initialized', () => {
      const uninitializedManager = new AirGapVulnManager();
      const health = uninitializedManager.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.initialized).toBe(false);
    });

    it('should return healthy when initialized', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      await manager.initialize();
      const health = manager.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.initialized).toBe(true);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getAirGapVulnManager', () => {
      // Reset the singleton for this test
      jest.resetModules();

      const instance1 = getAirGapVulnManager();
      const instance2 = getAirGapVulnManager();

      expect(instance1).toBe(instance2);
    });
  });
});
