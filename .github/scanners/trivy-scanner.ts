/**
 * Trivy Vulnerability Scanner Integration
 * @module .github/scanners/trivy-scanner
 */

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { loadConfig, CVSS_THRESHOLDS } from './config.js';
import type {
  Vulnerability,
  VulnerabilityScanResult,
  VulnerabilitySeverity,
  ScannerConfig,
  AirGapConfig,
  PolicyEvaluationResult,
  VulnerabilityPolicy,
  ServicePolicy,
} from './types.js';

export interface TrivyScanOptions {
  target: string;
  targetType?: 'image' | 'filesystem' | 'repository' | 'sbom';
  severity?: VulnerabilitySeverity[];
  ignoreUnfixed?: boolean;
  timeout?: string;
  scanners?: ('vuln' | 'misconfig' | 'secret' | 'license')[];
  outputFormat?: 'json' | 'sarif' | 'table';
  outputPath?: string;
  offlineDb?: string;
  ignoreFile?: string;
}

export interface TrivyScanResultExtended extends VulnerabilityScanResult {
  policyResult?: PolicyEvaluationResult;
  exitCode: number;
}

/**
 * Trivy Scanner class for vulnerability scanning
 */
export class TrivyScanner {
  private config: ScannerConfig;
  private airgapConfig: AirGapConfig;
  private policy: VulnerabilityPolicy;

  constructor(
    config?: Partial<ScannerConfig>,
    airgapConfig?: Partial<AirGapConfig>,
    policy?: VulnerabilityPolicy
  ) {
    const defaultConfig = loadConfig();
    this.config = { ...defaultConfig.scanner, ...config };
    this.airgapConfig = { ...defaultConfig.airgap, ...airgapConfig };
    this.policy = policy || defaultConfig.policy;
  }

  /**
   * Run Trivy vulnerability scan
   */
  async scan(options: TrivyScanOptions): Promise<TrivyScanResultExtended> {
    const scanId = crypto.randomUUID();
    const startTime = Date.now();

    const targetType = options.targetType || this.detectTargetType(options.target);
    const outputPath = options.outputPath || `/tmp/trivy-${scanId}.json`;

    try {
      console.log(`🔍 Scanning ${targetType}: ${options.target}`);

      // Build Trivy command
      const trivyArgs = this.buildTrivyArgs(options, targetType, outputPath);

      // Execute Trivy
      const result = await this.executeCommand('trivy', trivyArgs);

      // Parse results
      let scanResult: TrivyScanResultExtended;

      if (result.success || result.exitCode === 1) {
        // Exit code 1 means vulnerabilities found but scan succeeded
        const rawResult = await fs.readFile(outputPath, 'utf-8');
        const trivyOutput = JSON.parse(rawResult);
        scanResult = this.parseTrivyOutput(trivyOutput, scanId, options.target, targetType);
        scanResult.exitCode = result.exitCode;
      } else {
        scanResult = {
          scanId,
          scanTime: new Date().toISOString(),
          scanner: 'trivy',
          scannerVersion: await this.getTrivyVersion(),
          target: options.target,
          targetType,
          vulnerabilities: [],
          summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, unknown: 0, fixable: 0 },
          exitCode: result.exitCode,
          metadata: { error: result.stderr },
        };
      }

      // Apply policy evaluation
      const serviceName = this.extractServiceName(options.target);
      scanResult.policyResult = this.evaluatePolicy(serviceName, scanResult.vulnerabilities);

      // Log summary
      this.logScanSummary(scanResult);

      return scanResult;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        scanId,
        scanTime: new Date().toISOString(),
        scanner: 'trivy',
        scannerVersion: 'unknown',
        target: options.target,
        targetType,
        vulnerabilities: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, unknown: 0, fixable: 0 },
        exitCode: -1,
        metadata: { error: errorMessage },
      };
    }
  }

  /**
   * Scan for air-gapped environments
   */
  async scanAirGapped(options: TrivyScanOptions): Promise<TrivyScanResultExtended> {
    if (!this.airgapConfig.enabled) {
      return this.scan(options);
    }

    console.log('🔒 Running in air-gapped mode');

    // Use offline database
    const airgapOptions: TrivyScanOptions = {
      ...options,
      offlineDb: this.airgapConfig.vulnDbPath,
    };

    return this.scan(airgapOptions);
  }

  /**
   * Download Trivy database for offline use
   */
  async downloadDatabase(outputPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📥 Downloading Trivy vulnerability database...');

      const args = ['image', '--download-db-only', '--db-repository', 'ghcr.io/aquasecurity/trivy-db'];

      // Set cache directory
      const env = { ...process.env, TRIVY_CACHE_DIR: outputPath };

      const result = await this.executeCommand('trivy', args, env);

      if (result.success) {
        console.log(`✅ Database downloaded to: ${outputPath}`);
        return { success: true };
      }

      return { success: false, error: result.stderr };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Scan multiple targets in batch
   */
  async scanBatch(
    targets: { target: string; type?: 'image' | 'filesystem' | 'repository' | 'sbom' }[]
  ): Promise<Map<string, TrivyScanResultExtended>> {
    const results = new Map<string, TrivyScanResultExtended>();

    for (const { target, type } of targets) {
      const result = await this.scan({ target, targetType: type });
      results.set(target, result);
    }

    return results;
  }

  /**
   * Generate SARIF report for GitHub Security
   */
  async generateSarifReport(scanResult: TrivyScanResultExtended, outputPath: string): Promise<void> {
    const sarif = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'Trivy',
              version: scanResult.scannerVersion,
              informationUri: 'https://github.com/aquasecurity/trivy',
              rules: scanResult.vulnerabilities.map((vuln) => ({
                id: vuln.id,
                name: vuln.id,
                shortDescription: { text: vuln.title },
                fullDescription: { text: vuln.description },
                help: {
                  text: `Vulnerability ${vuln.id} in ${vuln.affectedPackage}`,
                  markdown: `# ${vuln.id}\n\n${vuln.description}\n\n## Fix\n\nUpdate to version ${vuln.fixedVersion || 'N/A'}`,
                },
                defaultConfiguration: {
                  level: this.mapSeverityToSarifLevel(vuln.severity),
                },
                properties: {
                  tags: ['security', 'vulnerability', vuln.severity],
                  precision: 'high',
                },
              })),
            },
          },
          results: scanResult.vulnerabilities.map((vuln) => ({
            ruleId: vuln.id,
            level: this.mapSeverityToSarifLevel(vuln.severity),
            message: { text: `${vuln.title} in ${vuln.affectedPackage}@${vuln.installedVersion}` },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: scanResult.target },
                },
                message: { text: `Package: ${vuln.affectedPackage}` },
              },
            ],
            properties: {
              cvssScore: vuln.cvssScore,
              fixedVersion: vuln.fixedVersion,
              exploitAvailable: vuln.exploitAvailable,
            },
          })),
        },
      ],
    };

    await fs.writeFile(outputPath, JSON.stringify(sarif, null, 2));
    console.log(`📄 SARIF report generated: ${outputPath}`);
  }

  /**
   * Build Trivy command arguments
   */
  private buildTrivyArgs(
    options: TrivyScanOptions,
    targetType: string,
    outputPath: string
  ): string[] {
    const args: string[] = [];

    // Scan type
    switch (targetType) {
      case 'image':
        args.push('image');
        break;
      case 'filesystem':
        args.push('fs');
        break;
      case 'repository':
        args.push('repo');
        break;
      case 'sbom':
        args.push('sbom');
        break;
      default:
        args.push('fs');
    }

    // Output format
    args.push('-f', options.outputFormat || 'json');
    args.push('-o', outputPath);

    // Severity filter
    const severities = options.severity || this.config.trivy.severity;
    args.push('--severity', severities.map((s) => s.toUpperCase()).join(','));

    // Scanners
    const scanners = options.scanners || this.config.trivy.scanners;
    args.push('--scanners', scanners.join(','));

    // Timeout
    args.push('--timeout', options.timeout || this.config.trivy.timeout);

    // Ignore unfixed
    if (options.ignoreUnfixed ?? this.config.trivy.ignoreUnfixed) {
      args.push('--ignore-unfixed');
    }

    // Offline database
    if (options.offlineDb || this.config.trivy.offlineDb) {
      args.push('--skip-db-update');
      args.push('--offline-scan');
    }

    // Ignore file
    if (options.ignoreFile) {
      args.push('--ignorefile', options.ignoreFile);
    }

    // Target
    args.push(options.target);

    return args;
  }

  /**
   * Parse Trivy output to standardized format
   */
  private parseTrivyOutput(
    output: any,
    scanId: string,
    target: string,
    targetType: string
  ): TrivyScanResultExtended {
    const vulnerabilities: Vulnerability[] = [];
    const summary = { total: 0, critical: 0, high: 0, medium: 0, low: 0, unknown: 0, fixable: 0 };

    // Handle different Trivy output formats
    const results = output.Results || [];

    for (const result of results) {
      const vulns = result.Vulnerabilities || [];

      for (const vuln of vulns) {
        const severity = (vuln.Severity?.toLowerCase() || 'unknown') as VulnerabilitySeverity;
        const hasFixedVersion = !!vuln.FixedVersion;

        const vulnerability: Vulnerability = {
          id: vuln.VulnerabilityID,
          source: vuln.DataSource?.ID || 'nvd',
          severity,
          cvssScore: vuln.CVSS?.nvd?.V3Score || vuln.CVSS?.redhat?.V3Score,
          cvssVector: vuln.CVSS?.nvd?.V3Vector || vuln.CVSS?.redhat?.V3Vector,
          title: vuln.Title || vuln.VulnerabilityID,
          description: vuln.Description || '',
          affectedPackage: vuln.PkgName,
          installedVersion: vuln.InstalledVersion,
          fixedVersion: vuln.FixedVersion,
          publishedDate: vuln.PublishedDate,
          lastModifiedDate: vuln.LastModifiedDate,
          references: vuln.References || [],
          exploitAvailable: vuln.ExploitAvailable,
          epssScore: vuln.EPSS?.Score,
          cisaKev: vuln.CisaKev,
        };

        vulnerabilities.push(vulnerability);

        // Update summary
        summary.total++;
        summary[severity]++;
        if (hasFixedVersion) summary.fixable++;
      }
    }

    return {
      scanId,
      scanTime: new Date().toISOString(),
      scanner: 'trivy',
      scannerVersion: output.SchemaVersion || 'unknown',
      target,
      targetType: targetType as 'image' | 'filesystem' | 'repository' | 'sbom',
      vulnerabilities,
      summary,
      exitCode: 0,
      metadata: {
        artifactName: output.ArtifactName,
        artifactType: output.ArtifactType,
      },
    };
  }

  /**
   * Evaluate vulnerabilities against policy
   */
  private evaluatePolicy(serviceName: string, vulnerabilities: Vulnerability[]): PolicyEvaluationResult {
    const servicePolicy: ServicePolicy =
      this.policy.services[serviceName] || {
        exposure: 'internal',
        severityThresholds: this.policy.global.defaultSeverityThresholds,
        allowedVulnerabilities: [],
        scanSchedule: 'daily',
      };

    const result: PolicyEvaluationResult = {
      allowed: true,
      blockedVulnerabilities: [],
      warnings: [],
      waiversApplied: [],
      policyViolations: [],
    };

    for (const vuln of vulnerabilities) {
      // Check if vulnerability is allowed
      if (servicePolicy.allowedVulnerabilities.includes(vuln.id)) {
        result.waiversApplied.push(vuln.id);
        continue;
      }

      // Check severity threshold
      const action = servicePolicy.severityThresholds[vuln.severity];

      switch (action) {
        case 'block':
          result.blockedVulnerabilities.push(vuln.id);
          result.allowed = false;
          result.policyViolations.push(`${vuln.id}: ${vuln.severity.toUpperCase()} severity blocked`);
          break;
        case 'warn':
          result.warnings.push(`${vuln.id}: ${vuln.severity.toUpperCase()} severity warning`);
          break;
        case 'ignore':
          // No action
          break;
      }
    }

    return result;
  }

  /**
   * Detect target type from path/reference
   */
  private detectTargetType(target: string): 'image' | 'filesystem' | 'repository' | 'sbom' {
    if (target.includes(':') && (target.includes('/') || target.includes('.'))) {
      // Likely a container image reference
      if (!target.startsWith('/') && !target.startsWith('.')) {
        return 'image';
      }
    }

    if (target.endsWith('.json') || target.endsWith('.xml')) {
      // Likely an SBOM file
      return 'sbom';
    }

    if (target.startsWith('https://') || target.startsWith('git@')) {
      return 'repository';
    }

    return 'filesystem';
  }

  /**
   * Extract service name from target
   */
  private extractServiceName(target: string): string {
    // Extract from image name: registry/org/service:tag -> service
    const match = target.match(/\/([^/:]+)(:|$)/);
    if (match) {
      return match[1];
    }

    // Extract from path: /path/to/service -> service
    return path.basename(target);
  }

  /**
   * Map severity to SARIF level
   */
  private mapSeverityToSarifLevel(severity: VulnerabilitySeverity): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'unknown':
        return 'note';
      default:
        return 'note';
    }
  }

  /**
   * Log scan summary
   */
  private logScanSummary(result: TrivyScanResultExtended): void {
    const { summary, policyResult } = result;

    console.log('\n📊 Scan Summary:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   Critical: ${summary.critical}`);
    console.log(`   High: ${summary.high}`);
    console.log(`   Medium: ${summary.medium}`);
    console.log(`   Low: ${summary.low}`);
    console.log(`   Fixable: ${summary.fixable}`);

    if (policyResult) {
      if (policyResult.allowed) {
        console.log('✅ Policy evaluation: PASSED');
      } else {
        console.log('❌ Policy evaluation: FAILED');
        console.log(`   Blocked: ${policyResult.blockedVulnerabilities.join(', ')}`);
      }
    }
  }

  /**
   * Get Trivy version
   */
  private async getTrivyVersion(): Promise<string> {
    try {
      const result = await this.executeCommand('trivy', ['--version']);
      const match = result.stdout.match(/Version: (\S+)/);
      return match ? match[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Execute a command
   */
  private executeCommand(
    command: string,
    args: string[],
    env?: NodeJS.ProcessEnv
  ): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const proc = spawn(command, args, { env: env || process.env });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      proc.on('error', (error) => {
        resolve({
          success: false,
          stdout,
          stderr: error.message,
          exitCode: -1,
        });
      });
    });
  }
}

/**
 * Create a new Trivy scanner instance
 */
export function createTrivyScanner(
  config?: Partial<ScannerConfig>,
  airgapConfig?: Partial<AirGapConfig>,
  policy?: VulnerabilityPolicy
): TrivyScanner {
  return new TrivyScanner(config, airgapConfig, policy);
}
