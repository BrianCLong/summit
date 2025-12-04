/**
 * Scanner Module Tests
 * @module .github/scanners/__tests__/scanners.test
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Mock child_process
jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}));

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  access: jest.fn(),
}));

import {
  createSBOMGenerator,
  createTrivyScanner,
  createSLSA3Attestor,
  createAutoPRFixer,
  createScannerSuite,
  runSecurityPipeline,
  loadConfig,
  DEFAULT_SCANNER_CONFIG,
  DEFAULT_AIRGAP_CONFIG,
  DEFAULT_VULNERABILITY_POLICY,
} from '../index.js';

import type {
  SBOMDocument,
  Vulnerability,
  VulnerabilityScanResult,
  SLSA3Provenance,
  AttestationBundle,
} from '../types.js';

// Helper to create mock spawn process
function createMockProcess(exitCode = 0, stdout = '', stderr = '') {
  const mockProcess = {
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data') callback(Buffer.from(stdout));
      }),
    },
    stderr: {
      on: jest.fn((event, callback) => {
        if (event === 'data') callback(Buffer.from(stderr));
      }),
    },
    on: jest.fn((event, callback) => {
      if (event === 'close') setTimeout(() => callback(exitCode), 0);
      if (event === 'error' && exitCode === -1) {
        setTimeout(() => callback(new Error('spawn error')), 0);
      }
    }),
  };
  return mockProcess;
}

describe('SBOMGenerator', () => {
  let generator: ReturnType<typeof createSBOMGenerator>;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = createSBOMGenerator();
  });

  describe('generateSBOM', () => {
    it('should generate SBOM successfully', async () => {
      const mockSBOM: SBOMDocument = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: 'urn:uuid:test',
        version: 1,
        metadata: {
          timestamp: new Date().toISOString(),
          tools: [{ vendor: 'anchore', name: 'syft', version: '1.0.0' }],
        },
        components: [
          { type: 'library', name: 'test-package', version: '1.0.0' },
          { type: 'library', name: 'another-package', version: '2.0.0' },
        ],
      };

      (spawn as jest.Mock).mockReturnValue(createMockProcess(0, 'SBOM generated'));
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSBOM));

      const result = await generator.generateSBOM({
        target: '.',
        outputPath: '/tmp/sbom.json',
      });

      expect(result.success).toBe(true);
      expect(result.componentCount).toBe(2);
      expect(result.digest).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle Syft failure', async () => {
      (spawn as jest.Mock).mockReturnValue(createMockProcess(1, '', 'Syft error'));

      const result = await generator.generateSBOM({
        target: '.',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Syft failed: Syft error');
    });

    it('should sign SBOM with Cosign when requested', async () => {
      const mockSBOM: SBOMDocument = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: 'urn:uuid:test',
        version: 1,
        metadata: { timestamp: new Date().toISOString() },
        components: [],
      };

      (spawn as jest.Mock)
        .mockReturnValueOnce(createMockProcess(0)) // syft
        .mockReturnValueOnce(createMockProcess(0)); // cosign

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSBOM));

      const result = await generator.generateSBOM({
        target: '.',
        signWithCosign: true,
      });

      expect(result.success).toBe(true);
      expect(spawn).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifySBOMSignature', () => {
    it('should verify valid signature', async () => {
      (spawn as jest.Mock).mockReturnValue(createMockProcess(0, 'Verified OK'));

      const result = await generator.verifySBOMSignature('/tmp/sbom.json', '/tmp/sbom.json.sig');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      (spawn as jest.Mock).mockReturnValue(createMockProcess(1, '', 'signature verification failed'));

      const result = await generator.verifySBOMSignature('/tmp/sbom.json', '/tmp/sbom.json.sig');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('signature verification failed');
    });
  });

  describe('mergeSBOMs', () => {
    it('should merge multiple SBOMs', async () => {
      const sbom1 = {
        components: [{ type: 'library', name: 'pkg1', version: '1.0.0', purl: 'pkg:npm/pkg1@1.0.0' }],
      };
      const sbom2 = {
        components: [{ type: 'library', name: 'pkg2', version: '2.0.0', purl: 'pkg:npm/pkg2@2.0.0' }],
      };

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(sbom1))
        .mockResolvedValueOnce(JSON.stringify(sbom2));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await generator.mergeSBOMs(['/tmp/sbom1.json', '/tmp/sbom2.json'], '/tmp/merged.json');

      expect(result.success).toBe(true);
      expect(result.componentCount).toBe(2);
    });

    it('should deduplicate components', async () => {
      const sbom1 = {
        components: [{ type: 'library', name: 'pkg1', version: '1.0.0', purl: 'pkg:npm/pkg1@1.0.0' }],
      };
      const sbom2 = {
        components: [{ type: 'library', name: 'pkg1', version: '1.0.0', purl: 'pkg:npm/pkg1@1.0.0' }],
      };

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(sbom1))
        .mockResolvedValueOnce(JSON.stringify(sbom2));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await generator.mergeSBOMs(['/tmp/sbom1.json', '/tmp/sbom2.json'], '/tmp/merged.json');

      expect(result.componentCount).toBe(1);
    });
  });
});

describe('TrivyScanner', () => {
  let scanner: ReturnType<typeof createTrivyScanner>;

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = createTrivyScanner();
  });

  describe('scan', () => {
    it('should scan filesystem successfully', async () => {
      const mockTrivyOutput = {
        SchemaVersion: 2,
        Results: [
          {
            Vulnerabilities: [
              {
                VulnerabilityID: 'CVE-2025-1234',
                Severity: 'HIGH',
                Title: 'Test Vulnerability',
                Description: 'Test description',
                PkgName: 'test-pkg',
                InstalledVersion: '1.0.0',
                FixedVersion: '1.0.1',
              },
            ],
          },
        ],
      };

      (spawn as jest.Mock)
        .mockReturnValueOnce(createMockProcess(0)) // trivy scan
        .mockReturnValueOnce(createMockProcess(0, 'Version: 0.50.0')); // version check

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTrivyOutput));

      const result = await scanner.scan({
        target: '.',
        targetType: 'filesystem',
      });

      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.summary.high).toBe(1);
      expect(result.vulnerabilities[0].id).toBe('CVE-2025-1234');
    });

    it('should handle scan with no vulnerabilities', async () => {
      const mockTrivyOutput = {
        SchemaVersion: 2,
        Results: [],
      };

      (spawn as jest.Mock).mockReturnValue(createMockProcess(0));
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTrivyOutput));

      const result = await scanner.scan({ target: '.' });

      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('should evaluate policy correctly', async () => {
      const mockTrivyOutput = {
        SchemaVersion: 2,
        Results: [
          {
            Vulnerabilities: [
              {
                VulnerabilityID: 'CVE-2025-CRIT',
                Severity: 'CRITICAL',
                PkgName: 'critical-pkg',
                InstalledVersion: '1.0.0',
              },
            ],
          },
        ],
      };

      (spawn as jest.Mock).mockReturnValue(createMockProcess(0));
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTrivyOutput));

      const result = await scanner.scan({ target: 'intelgraph-server' });

      expect(result.policyResult).toBeDefined();
      expect(result.policyResult?.allowed).toBe(false);
      expect(result.policyResult?.blockedVulnerabilities).toContain('CVE-2025-CRIT');
    });

    it('should detect target type correctly', async () => {
      (spawn as jest.Mock).mockReturnValue(createMockProcess(0));
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ Results: [] }));

      // Image reference
      await scanner.scan({ target: 'ghcr.io/org/image:latest' });
      expect(spawn).toHaveBeenCalledWith('trivy', expect.arrayContaining(['image']), expect.anything());

      jest.clearAllMocks();

      // SBOM file
      (spawn as jest.Mock).mockReturnValue(createMockProcess(0));
      await scanner.scan({ target: '/path/to/sbom.json' });
      expect(spawn).toHaveBeenCalledWith('trivy', expect.arrayContaining(['sbom']), expect.anything());
    });
  });

  describe('generateSarifReport', () => {
    it('should generate valid SARIF report', async () => {
      const scanResult = {
        scanId: 'test-scan',
        scanTime: new Date().toISOString(),
        scanner: 'trivy',
        scannerVersion: '0.50.0',
        target: '.',
        targetType: 'filesystem' as const,
        vulnerabilities: [
          {
            id: 'CVE-2025-1234',
            source: 'nvd',
            severity: 'high' as const,
            title: 'Test Vulnerability',
            description: 'Test description',
            affectedPackage: 'test-pkg',
            installedVersion: '1.0.0',
            fixedVersion: '1.0.1',
            references: [],
          },
        ],
        summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0, unknown: 0, fixable: 1 },
        exitCode: 0,
      };

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await scanner.generateSarifReport(scanResult, '/tmp/report.sarif');

      expect(fs.writeFile).toHaveBeenCalled();
      const writtenContent = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(writtenContent.$schema).toContain('sarif');
      expect(writtenContent.runs[0].results).toHaveLength(1);
    });
  });
});

describe('SLSA3Attestor', () => {
  let attestor: ReturnType<typeof createSLSA3Attestor>;

  beforeEach(() => {
    jest.clearAllMocks();
    attestor = createSLSA3Attestor();
  });

  describe('generateProvenance', () => {
    it('should generate valid SLSA provenance', async () => {
      const artifactContent = 'test artifact content';
      (fs.readFile as jest.Mock).mockResolvedValue(artifactContent);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await attestor.generateProvenance({
        artifactPath: '/tmp/artifact.tar.gz',
        outputPath: '/tmp/provenance.json',
        sourceUri: 'https://github.com/test/repo',
        sourceDigest: 'abc123',
      });

      expect(result.success).toBe(true);
      expect(result.digest).toBeDefined();
      expect(result.bundlePath).toBe('/tmp/provenance.json');
    });

    it('should sign provenance when requested', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('artifact');
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      (spawn as jest.Mock).mockReturnValue(createMockProcess(0, 'signature'));

      const result = await attestor.generateProvenance({
        artifactPath: '/tmp/artifact.tar.gz',
        signWithCosign: true,
      });

      expect(result.success).toBe(true);
      expect(spawn).toHaveBeenCalled();
    });
  });

  describe('verifyProvenance', () => {
    it('should verify valid provenance', async () => {
      const provenance: SLSA3Provenance = {
        _type: 'https://in-toto.io/Statement/v0.1',
        predicateType: 'https://slsa.dev/provenance/v1',
        subject: [{ name: 'artifact', digest: { sha256: 'abc123' } }],
        predicate: {
          buildDefinition: {
            buildType: 'https://github.com/slsa-framework/slsa-github-generator/generic@v1',
            externalParameters: {},
            resolvedDependencies: [
              { uri: 'https://github.com/intelgraph/test', digest: { sha1: 'def456' } },
            ],
          },
          runDetails: {
            builder: {
              id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml',
            },
            metadata: {
              invocationId: 'test-123',
              startedOn: new Date().toISOString(),
              finishedOn: new Date().toISOString(),
            },
          },
        },
      };

      const bundle: AttestationBundle = {
        dsseEnvelope: {
          payload: Buffer.from(JSON.stringify(provenance)).toString('base64'),
          payloadType: 'application/vnd.in-toto+json',
          signatures: [{ keyid: 'test', sig: 'sig' }],
        },
      };

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(bundle))
        .mockResolvedValueOnce('artifact content');

      const result = await attestor.verifyProvenance({
        bundlePath: '/tmp/bundle.json',
        artifactPath: '/tmp/artifact',
      });

      expect(result.provenance).toBeDefined();
      expect(result.checks.formatValid).toBe(true);
      expect(result.checks.builderTrusted).toBe(true);
    });

    it('should reject untrusted builder', async () => {
      const provenance: SLSA3Provenance = {
        _type: 'https://in-toto.io/Statement/v0.1',
        predicateType: 'https://slsa.dev/provenance/v1',
        subject: [{ name: 'artifact', digest: { sha256: 'abc123' } }],
        predicate: {
          buildDefinition: {
            buildType: 'generic',
            externalParameters: {},
          },
          runDetails: {
            builder: { id: 'https://untrusted-builder.com/build' },
            metadata: {
              invocationId: 'test',
              startedOn: new Date().toISOString(),
              finishedOn: new Date().toISOString(),
            },
          },
        },
      };

      const bundle: AttestationBundle = {
        dsseEnvelope: {
          payload: Buffer.from(JSON.stringify(provenance)).toString('base64'),
          payloadType: 'application/vnd.in-toto+json',
          signatures: [{ keyid: 'test', sig: 'sig' }],
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(bundle));

      const result = await attestor.verifyProvenance({
        bundlePath: '/tmp/bundle.json',
        artifactPath: '/tmp/artifact',
      });

      expect(result.checks.builderTrusted).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Untrusted builder'));
    });
  });
});

describe('AutoPRFixer', () => {
  let fixer: ReturnType<typeof createAutoPRFixer>;

  beforeEach(() => {
    jest.clearAllMocks();
    fixer = createAutoPRFixer('/tmp/test-repo');
  });

  describe('analyzeFixSuggestions', () => {
    it('should generate fix suggestions for fixable vulnerabilities', async () => {
      const scanResult: VulnerabilityScanResult = {
        scanId: 'test',
        scanTime: new Date().toISOString(),
        scanner: 'trivy',
        scannerVersion: '0.50.0',
        target: '.',
        targetType: 'filesystem',
        vulnerabilities: [
          {
            id: 'CVE-2025-1234',
            source: 'nvd',
            severity: 'high',
            title: 'Test Vuln',
            description: 'Test',
            affectedPackage: 'test-pkg',
            installedVersion: '1.0.0',
            fixedVersion: '1.0.1',
            references: [],
          },
        ],
        summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0, unknown: 0, fixable: 1 },
      };

      (fs.access as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const suggestions = await fixer.analyzeFixSuggestions(scanResult);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].vulnerabilityId).toBe('CVE-2025-1234');
      expect(suggestions[0].fixedVersion).toBe('1.0.1');
      expect(suggestions[0].confidence).toBe('high'); // patch version bump
    });

    it('should identify breaking changes', async () => {
      const scanResult: VulnerabilityScanResult = {
        scanId: 'test',
        scanTime: new Date().toISOString(),
        scanner: 'trivy',
        scannerVersion: '0.50.0',
        target: '.',
        targetType: 'filesystem',
        vulnerabilities: [
          {
            id: 'CVE-2025-BREAK',
            source: 'nvd',
            severity: 'critical',
            title: 'Breaking Vuln',
            description: 'Test',
            affectedPackage: 'breaking-pkg',
            installedVersion: '1.0.0',
            fixedVersion: '2.0.0', // Major version bump
            references: [],
          },
        ],
        summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0, unknown: 0, fixable: 1 },
      };

      (fs.access as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const suggestions = await fixer.analyzeFixSuggestions(scanResult);

      expect(suggestions[0].breakingChange).toBe(true);
      expect(suggestions[0].confidence).toBe('low');
    });
  });

  describe('applyFixes', () => {
    it('should apply fixes in dry run mode', async () => {
      const scanResult: VulnerabilityScanResult = {
        scanId: 'test',
        scanTime: new Date().toISOString(),
        scanner: 'trivy',
        scannerVersion: '0.50.0',
        target: '.',
        targetType: 'filesystem',
        vulnerabilities: [
          {
            id: 'CVE-2025-1234',
            source: 'nvd',
            severity: 'high',
            title: 'Test',
            description: 'Test',
            affectedPackage: 'test-pkg',
            installedVersion: '1.0.0',
            fixedVersion: '1.0.1',
            references: [],
          },
        ],
        summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0, unknown: 0, fixable: 1 },
      };

      (fs.access as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const result = await fixer.applyFixes({
        scanResult,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.fixesApplied).toHaveLength(1);
      expect(spawn).not.toHaveBeenCalled(); // No commands executed in dry run
    });

    it('should skip breaking changes when configured', async () => {
      const scanResult: VulnerabilityScanResult = {
        scanId: 'test',
        scanTime: new Date().toISOString(),
        scanner: 'trivy',
        scannerVersion: '0.50.0',
        target: '.',
        targetType: 'filesystem',
        vulnerabilities: [
          {
            id: 'CVE-2025-BREAK',
            source: 'nvd',
            severity: 'critical',
            title: 'Breaking',
            description: 'Test',
            affectedPackage: 'pkg',
            installedVersion: '1.0.0',
            fixedVersion: '2.0.0',
            references: [],
          },
        ],
        summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0, unknown: 0, fixable: 1 },
      };

      (fs.access as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const result = await fixer.applyFixes({
        scanResult,
        dryRun: true,
        excludeBreakingChanges: true,
      });

      expect(result.summary.skipped).toBe(1);
      expect(result.fixesApplied).toHaveLength(0);
    });
  });
});

describe('Configuration', () => {
  describe('loadConfig', () => {
    it('should load default configuration', () => {
      const config = loadConfig();

      expect(config.scanner).toBeDefined();
      expect(config.airgap).toBeDefined();
      expect(config.policy).toBeDefined();
    });

    it('should have correct default values', () => {
      expect(DEFAULT_SCANNER_CONFIG.syft.outputFormat).toBe('cyclonedx-json');
      expect(DEFAULT_SCANNER_CONFIG.trivy.severity).toContain('critical');
      expect(DEFAULT_SCANNER_CONFIG.slsa.requireHermetic).toBe(true);
    });

    it('should have valid policy defaults', () => {
      expect(DEFAULT_VULNERABILITY_POLICY.global.defaultSeverityThresholds.critical).toBe('block');
      expect(DEFAULT_VULNERABILITY_POLICY.services['intelgraph-server'].exposure).toBe('internet-facing');
    });
  });
});

describe('Scanner Suite', () => {
  it('should create complete scanner suite', () => {
    const suite = createScannerSuite();

    expect(suite.sbom).toBeDefined();
    expect(suite.trivy).toBeDefined();
    expect(suite.slsa).toBeDefined();
    expect(suite.autofix).toBeDefined();
    expect(suite.config).toBeDefined();
  });

  it('should accept custom configuration', () => {
    const suite = createScannerSuite({
      config: {
        trivy: {
          ...DEFAULT_SCANNER_CONFIG.trivy,
          severity: ['critical'],
        },
      },
    });

    expect(suite.config.scanner.trivy.severity).toEqual(['critical']);
  });
});

describe('Security Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should run complete security pipeline', async () => {
    const mockSBOM = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: 'urn:uuid:test',
      version: 1,
      metadata: { timestamp: new Date().toISOString() },
      components: [{ type: 'library', name: 'pkg', version: '1.0.0' }],
    };

    const mockTrivyOutput = {
      SchemaVersion: 2,
      Results: [],
    };

    (spawn as jest.Mock).mockReturnValue(createMockProcess(0));
    (fs.readFile as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(mockSBOM))
      .mockResolvedValueOnce(JSON.stringify(mockTrivyOutput))
      .mockResolvedValueOnce('artifact');
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    const result = await runSecurityPipeline({
      target: '.',
      generateSBOM: true,
      generateAttestation: true,
      autoFix: false,
    });

    expect(result.sbomResult).toBeDefined();
    expect(result.scanResult).toBeDefined();
    expect(result.success).toBe(true);
  });
});
