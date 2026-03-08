"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
/**
 * Air-Gap Vulnerability Manager Tests
 * @module server/src/security/__tests__/airgap-vuln-manager.test
 *
 * Note: This test uses jest.unstable_mockModule for ESM compatibility.
 * The module is dynamically imported after mocks are set up.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock fs/promises using unstable_mockModule for ESM support
// This MUST happen before any dynamic imports of modules that use fs
globals_1.jest.unstable_mockModule('node:fs/promises', () => ({
    default: {
        readFile: globals_1.jest.fn(),
        writeFile: globals_1.jest.fn(),
        mkdir: globals_1.jest.fn(),
        access: globals_1.jest.fn(),
    },
    readFile: globals_1.jest.fn(),
    writeFile: globals_1.jest.fn(),
    mkdir: globals_1.jest.fn(),
    access: globals_1.jest.fn(),
}));
(0, globals_1.describe)('AirGapVulnManager', () => {
    let AirGapVulnManager;
    let getAirGapVulnManager;
    let fs;
    let manager;
    (0, globals_1.beforeAll)(async () => {
        // Dynamic import after mocking
        const fsModule = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
        fs = fsModule.default || fsModule; // Handle potential default export difference
        const module = await Promise.resolve().then(() => __importStar(require('../airgap-vuln-manager.js')));
        AirGapVulnManager = module.AirGapVulnManager;
        getAirGapVulnManager = module.getAirGapVulnManager;
    });
    const mockVulnerabilities = [
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
    const mockSBOMs = [
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
    const mockScans = [
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
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        manager = new AirGapVulnManager({
            dataDir: '/tmp/test-vuln-data',
        });
        // Setup default mocks
        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockResolvedValue(undefined);
    });
    (0, globals_1.describe)('initialization', () => {
        (0, globals_1.it)('should initialize successfully with existing data', async () => {
            fs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockVulnerabilities))
                .mockResolvedValueOnce(JSON.stringify(mockSBOMs))
                .mockResolvedValueOnce(JSON.stringify(mockScans));
            await manager.initialize();
            const health = manager.healthCheck();
            (0, globals_1.expect)(health.status).toBe('healthy');
            (0, globals_1.expect)(health.details.vulnerabilityCount).toBe(2);
            (0, globals_1.expect)(health.details.sbomCount).toBe(1);
        });
        (0, globals_1.it)('should initialize with empty data when files do not exist', async () => {
            fs.readFile.mockRejectedValue({ code: 'ENOENT' });
            await manager.initialize();
            const health = manager.healthCheck();
            (0, globals_1.expect)(health.status).toBe('healthy');
            (0, globals_1.expect)(health.details.vulnerabilityCount).toBe(0);
        });
        globals_1.it.skip('should throw on non-ENOENT errors', async () => {
            fs.readFile.mockRejectedValue(new Error('Permission denied'));
            await (0, globals_1.expect)(manager.initialize()).rejects.toThrow('Permission denied');
        });
    });
    (0, globals_1.describe)('vulnerability management', () => {
        (0, globals_1.beforeEach)(async () => {
            fs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockVulnerabilities))
                .mockResolvedValueOnce(JSON.stringify([]))
                .mockResolvedValueOnce(JSON.stringify([]));
            await manager.initialize();
        });
        (0, globals_1.it)('should get vulnerability by ID', () => {
            const vuln = manager.getVulnerability('CVE-2025-1234');
            (0, globals_1.expect)(vuln).toBeDefined();
            (0, globals_1.expect)(vuln?.severity).toBe('critical');
        });
        (0, globals_1.it)('should return undefined for non-existent vulnerability', () => {
            const vuln = manager.getVulnerability('CVE-NONEXISTENT');
            (0, globals_1.expect)(vuln).toBeUndefined();
        });
        (0, globals_1.it)('should search vulnerabilities by severity', () => {
            const results = manager.searchVulnerabilities({ severity: ['critical'] });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].id).toBe('CVE-2025-1234');
        });
        (0, globals_1.it)('should search vulnerabilities by package', () => {
            const results = manager.searchVulnerabilities({ package: 'sql' });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].id).toBe('CVE-2025-5678');
        });
        (0, globals_1.it)('should filter by exploit availability', () => {
            const results = manager.searchVulnerabilities({ hasExploit: true });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].exploitAvailable).toBe(true);
        });
        (0, globals_1.it)('should filter by CISA KEV', () => {
            const results = manager.searchVulnerabilities({ cisaKev: true });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].cisaKev).toBe(true);
        });
        (0, globals_1.it)('should respect limit parameter', () => {
            const results = manager.searchVulnerabilities({ limit: 1 });
            (0, globals_1.expect)(results).toHaveLength(1);
        });
        (0, globals_1.it)('should import new vulnerabilities', async () => {
            const newVuln = {
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
            (0, globals_1.expect)(imported).toBe(1);
            (0, globals_1.expect)(manager.getVulnerability('CVE-2025-9999')).toBeDefined();
        });
        (0, globals_1.it)('should update existing vulnerability if newer', async () => {
            const updatedVuln = {
                ...mockVulnerabilities[0],
                lastModifiedDate: '2025-01-20T00:00:00Z',
                description: 'Updated description',
            };
            const imported = await manager.importVulnerabilities([updatedVuln]);
            (0, globals_1.expect)(imported).toBe(1);
            (0, globals_1.expect)(manager.getVulnerability('CVE-2025-1234')?.description).toBe('Updated description');
        });
        (0, globals_1.it)('should not update if existing is newer', async () => {
            const olderVuln = {
                ...mockVulnerabilities[0],
                lastModifiedDate: '2024-12-01T00:00:00Z',
                description: 'Older description',
            };
            const imported = await manager.importVulnerabilities([olderVuln]);
            (0, globals_1.expect)(imported).toBe(0);
            (0, globals_1.expect)(manager.getVulnerability('CVE-2025-1234')?.description).toBe('Remote code execution vulnerability');
        });
    });
    (0, globals_1.describe)('SBOM management', () => {
        (0, globals_1.beforeEach)(async () => {
            fs.readFile
                .mockResolvedValueOnce(JSON.stringify([]))
                .mockResolvedValueOnce(JSON.stringify(mockSBOMs))
                .mockResolvedValueOnce(JSON.stringify([]));
            await manager.initialize();
        });
        (0, globals_1.it)('should get SBOM by ID', () => {
            const sbom = manager.getSBOM('sbom-1');
            (0, globals_1.expect)(sbom).toBeDefined();
            (0, globals_1.expect)(sbom?.name).toBe('test-app');
        });
        (0, globals_1.it)('should get all SBOMs sorted by timestamp', () => {
            const sboms = manager.getAllSBOMs();
            (0, globals_1.expect)(sboms).toHaveLength(1);
        });
        (0, globals_1.it)('should record new SBOM', async () => {
            const newSBOM = {
                id: 'sbom-2',
                name: 'new-app',
                version: '2.0.0',
                timestamp: new Date().toISOString(),
                componentCount: 50,
                digest: 'sha256:def456',
                vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
            };
            await manager.recordSBOM(newSBOM);
            (0, globals_1.expect)(manager.getSBOM('sbom-2')).toBeDefined();
            (0, globals_1.expect)(fs.writeFile).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('scan history', () => {
        (0, globals_1.beforeEach)(async () => {
            fs.readFile
                .mockResolvedValueOnce(JSON.stringify([]))
                .mockResolvedValueOnce(JSON.stringify([]))
                .mockResolvedValueOnce(JSON.stringify(mockScans));
            await manager.initialize();
        });
        (0, globals_1.it)('should get recent scans', () => {
            const scans = manager.getRecentScans(10);
            (0, globals_1.expect)(scans).toHaveLength(1);
        });
        (0, globals_1.it)('should record new scan', async () => {
            const newScan = {
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
            (0, globals_1.expect)(scans).toHaveLength(2);
            (0, globals_1.expect)(scans[0].id).toBe('scan-2'); // Most recent first
        });
        (0, globals_1.it)('should limit scan history size', async () => {
            const limitedManager = new AirGapVulnManager({
                dataDir: '/tmp/test',
                maxHistoryEntries: 2,
            });
            fs.readFile
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
            (0, globals_1.expect)(scans.length).toBeLessThanOrEqual(2);
        });
    });
    (0, globals_1.describe)('dashboard data', () => {
        (0, globals_1.beforeEach)(async () => {
            fs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockVulnerabilities))
                .mockResolvedValueOnce(JSON.stringify(mockSBOMs))
                .mockResolvedValueOnce(JSON.stringify(mockScans));
            await manager.initialize();
        });
        (0, globals_1.it)('should generate complete dashboard data', async () => {
            const data = await manager.getDashboardData();
            (0, globals_1.expect)(data.summary).toBeDefined();
            (0, globals_1.expect)(data.summary.totalVulnerabilities).toBe(2);
            (0, globals_1.expect)(data.summary.criticalCount).toBe(1);
            (0, globals_1.expect)(data.summary.sbomCount).toBe(1);
            (0, globals_1.expect)(data.recentScans).toHaveLength(1);
            (0, globals_1.expect)(data.sboms).toHaveLength(1);
            (0, globals_1.expect)(data.topVulnerabilities.length).toBeGreaterThan(0);
            (0, globals_1.expect)(data.trendData).toBeDefined();
        });
        (0, globals_1.it)('should calculate policy pass rate', async () => {
            const data = await manager.getDashboardData();
            // One scan that failed policy
            (0, globals_1.expect)(data.summary.policyPassRate).toBe(0);
        });
        (0, globals_1.it)('should include trend data for last 30 days', async () => {
            const data = await manager.getDashboardData();
            (0, globals_1.expect)(data.trendData.length).toBeLessThanOrEqual(30);
            data.trendData.forEach((point) => {
                (0, globals_1.expect)(point.date).toBeDefined();
                (0, globals_1.expect)(typeof point.critical).toBe('number');
                (0, globals_1.expect)(typeof point.high).toBe('number');
            });
        });
    });
    (0, globals_1.describe)('compliance report', () => {
        (0, globals_1.beforeEach)(async () => {
            fs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockVulnerabilities))
                .mockResolvedValueOnce(JSON.stringify(mockSBOMs))
                .mockResolvedValueOnce(JSON.stringify(mockScans));
            await manager.initialize();
        });
        (0, globals_1.it)('should generate compliance report', async () => {
            const report = await manager.generateComplianceReport();
            (0, globals_1.expect)(report.generatedAt).toBeDefined();
            (0, globals_1.expect)(report.period.start).toBeDefined();
            (0, globals_1.expect)(report.period.end).toBeDefined();
            (0, globals_1.expect)(report.summary).toBeDefined();
            (0, globals_1.expect)(report.metrics).toBeDefined();
            (0, globals_1.expect)(report.recommendations).toBeDefined();
        });
        (0, globals_1.it)('should include actionable recommendations', async () => {
            const report = await manager.generateComplianceReport();
            // Should recommend addressing critical vulns
            (0, globals_1.expect)(report.recommendations.some((r) => r.toLowerCase().includes('critical'))).toBe(true);
        });
    });
    (0, globals_1.describe)('health check', () => {
        (0, globals_1.it)('should return unhealthy when not initialized', () => {
            const uninitializedManager = new AirGapVulnManager();
            const health = uninitializedManager.healthCheck();
            (0, globals_1.expect)(health.status).toBe('unhealthy');
            (0, globals_1.expect)(health.details.initialized).toBe(false);
        });
        (0, globals_1.it)('should return healthy when initialized', async () => {
            fs.readFile.mockRejectedValue({ code: 'ENOENT' });
            await manager.initialize();
            const health = manager.healthCheck();
            (0, globals_1.expect)(health.status).toBe('healthy');
            (0, globals_1.expect)(health.details.initialized).toBe(true);
        });
    });
    (0, globals_1.describe)('singleton pattern', () => {
        (0, globals_1.it)('should return same instance from getAirGapVulnManager', () => {
            // Reset the singleton for this test
            globals_1.jest.resetModules();
            const instance1 = getAirGapVulnManager();
            const instance2 = getAirGapVulnManager();
            (0, globals_1.expect)(instance1).toBe(instance2);
        });
    });
});
