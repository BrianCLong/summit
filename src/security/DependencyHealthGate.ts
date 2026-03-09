#!/usr/bin/env node

/**
 * Dependency Health Gate
 * OSV vulnerability and license allowlist checks with severity tiers
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface Vulnerability {
  id: string;
  summary: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'INFO';
  cvssScore?: number;
  packageName: string;
  affectedVersions: string[];
  fixedVersions: string[];
  publishedDate: string;
  modifiedDate: string;
  references: string[];
  cwe?: string[];
}

export interface LicenseInfo {
  license: string;
  packageName: string;
  version: string;
  licenseType: 'permissive' | 'copyleft' | 'proprietary' | 'unknown';
  allowlistStatus: 'allowed' | 'denied' | 'requires_approval';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface HealthGateResult {
  buildId: string;
  timestamp: number;
  overallStatus: 'pass' | 'warn' | 'fail';
  vulnerabilities: Vulnerability[];
  licenses: LicenseInfo[];
  blockers: Array<{
    type: 'vulnerability' | 'license';
    severity: string;
    description: string;
    remediation: string;
  }>;
  warnings: Array<{
    type: 'vulnerability' | 'license';
    description: string;
    remediation: string;
  }>;
  exceptions: TTLException[];
  executionTime: number;
}

export interface TTLException {
  id: string;
  type: 'vulnerability' | 'license';
  target: string; // package name or vulnerability ID
  reason: string;
  approver: string;
  createdAt: number;
  expiresAt: number;
  auditTrail: Array<{
    action: string;
    user: string;
    timestamp: number;
    reason?: string;
  }>;
}

export interface HealthGatePolicy {
  vulnerabilities: {
    blockSeverities: string[];
    warnSeverities: string[];
    allowSeverities: string[];
    maxCvssScore: number;
    enableOsvScanning: boolean;
    osvDatabaseUrl?: string;
  };
  licenses: {
    allowlist: string[];
    denylist: string[];
    requireApproval: string[];
    blockUnknown: boolean;
    enableLicenseScanning: boolean;
  };
  enforcement: {
    mode: 'enforce' | 'warn' | 'audit';
    failOnBlockers: boolean;
    allowTtlExceptions: boolean;
    maxExceptionDuration: number; // milliseconds
  };
  scanning: {
    packageFiles: string[];
    cacheResults: boolean;
    cacheTtl: number;
    timeout: number;
  };
}

export interface PackageInfo {
  name: string;
  version: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class DependencyHealthGate extends EventEmitter {
  private policy: HealthGatePolicy;
  private osvCache: Map<string, Vulnerability[]> = new Map();
  private licenseCache: Map<string, LicenseInfo> = new Map();
  private exceptions: Map<string, TTLException> = new Map();

  private metrics = {
    totalScans: 0,
    passedScans: 0,
    blockedScans: 0,
    exceptionsUsed: 0,
    avgScanTime: 0,
    vulnerabilitiesFound: 0,
    licensesScanned: 0,
  };

  constructor(policy: HealthGatePolicy) {
    super();

    this.policy = {
      vulnerabilities: {
        blockSeverities: ['CRITICAL', 'HIGH'],
        warnSeverities: ['MODERATE'],
        allowSeverities: ['LOW', 'INFO'],
        maxCvssScore: 7.0,
        enableOsvScanning: true,
        osvDatabaseUrl: 'https://api.osv.dev',
        ...policy.vulnerabilities,
      },
      licenses: {
        allowlist: [
          'MIT',
          'Apache-2.0',
          'BSD-3-Clause',
          'BSD-2-Clause',
          'ISC',
          'Unlicense',
          'CC0-1.0',
        ],
        denylist: ['AGPL-3.0', 'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0'],
        requireApproval: ['MPL-2.0', 'EPL-2.0', 'CDDL-1.0'],
        blockUnknown: true,
        enableLicenseScanning: true,
        ...policy.licenses,
      },
      enforcement: {
        mode: 'warn',
        failOnBlockers: false,
        allowTtlExceptions: true,
        maxExceptionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
        ...policy.enforcement,
      },
      scanning: {
        packageFiles: ['package.json', 'yarn.lock', 'package-lock.json'],
        cacheResults: true,
        cacheTtl: 3600000, // 1 hour
        timeout: 30000, // 30 seconds
        ...policy.scanning,
      },
    };

    // Clean up expired exceptions periodically
    setInterval(() => this.cleanupExpiredExceptions(), 3600000); // hourly

    console.log(
      `🛡️ Dependency Health Gate initialized (${this.policy.enforcement.mode} mode)`,
    );
  }

  /**
   * Scan project dependencies and apply health gate policies
   */
  async scanDependencies(
    projectPath: string,
    buildId: string,
  ): Promise<HealthGateResult> {
    console.log(`🔍 Scanning dependencies for build ${buildId}`);

    const startTime = performance.now();
    this.metrics.totalScans++;

    try {
      // Discover package files
      const packageFiles = await this.discoverPackageFiles(projectPath);

      if (packageFiles.length === 0) {
        console.warn('⚠️ No package files found');
        return this.createEmptyResult(buildId, startTime);
      }

      // Parse package information
      const packages = await this.parsePackageFiles(packageFiles);

      // Scan for vulnerabilities
      let vulnerabilities: Vulnerability[] = [];
      if (this.policy.vulnerabilities.enableOsvScanning) {
        vulnerabilities = await this.scanVulnerabilities(packages);
      }

      // Scan licenses
      let licenses: LicenseInfo[] = [];
      if (this.policy.licenses.enableLicenseScanning) {
        licenses = await this.scanLicenses(packages);
      }

      // Apply policy evaluation
      const result = await this.evaluateHealthPolicy(
        buildId,
        vulnerabilities,
        licenses,
        startTime,
      );

      // Update metrics
      this.updateMetrics(result);

      // Log results
      this.logResults(result);

      this.emit('scan_completed', result);

      return result;
    } catch (error) {
      console.error(`❌ Dependency scan failed for build ${buildId}:`, error);

      const failedResult: HealthGateResult = {
        buildId,
        timestamp: Date.now(),
        overallStatus: this.policy.enforcement.failOnBlockers ? 'fail' : 'warn',
        vulnerabilities: [],
        licenses: [],
        blockers: [
          {
            type: 'vulnerability',
            severity: 'HIGH',
            description: `Dependency scan failed: ${error.message}`,
            remediation:
              'Check network connectivity and dependency scan configuration',
          },
        ],
        warnings: [],
        exceptions: [],
        executionTime: performance.now() - startTime,
      };

      return failedResult;
    }
  }

  /**
   * Create a TTL exception for a vulnerability or license
   */
  async createException(
    target: string,
    type: 'vulnerability' | 'license',
    reason: string,
    approver: string,
    durationMs?: number,
  ): Promise<TTLException> {
    const exceptionId = `exc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const duration = durationMs || this.policy.enforcement.maxExceptionDuration;

    const exception: TTLException = {
      id: exceptionId,
      type,
      target,
      reason,
      approver,
      createdAt: now,
      expiresAt: now + duration,
      auditTrail: [
        {
          action: 'created',
          user: approver,
          timestamp: now,
          reason,
        },
      ],
    };

    this.exceptions.set(exceptionId, exception);

    console.log(
      `📝 Created ${type} exception: ${target} (expires: ${new Date(exception.expiresAt).toISOString()})`,
    );

    this.emit('exception_created', exception);

    return exception;
  }

  /**
   * Revoke an existing exception
   */
  async revokeException(
    exceptionId: string,
    revoker: string,
    reason?: string,
  ): Promise<void> {
    const exception = this.exceptions.get(exceptionId);

    if (!exception) {
      throw new Error(`Exception ${exceptionId} not found`);
    }

    exception.auditTrail.push({
      action: 'revoked',
      user: revoker,
      timestamp: Date.now(),
      reason: reason || 'Manual revocation',
    });

    this.exceptions.delete(exceptionId);

    console.log(`🚫 Revoked exception: ${exceptionId}`);

    this.emit('exception_revoked', { exceptionId, revoker, reason });
  }

  private async discoverPackageFiles(projectPath: string): Promise<string[]> {
    const packageFiles: string[] = [];

    for (const fileName of this.policy.scanning.packageFiles) {
      const filePath = path.join(projectPath, fileName);

      try {
        await fs.access(filePath);
        packageFiles.push(filePath);
      } catch {
        // File doesn't exist, skip
      }
    }

    return packageFiles;
  }

  private async parsePackageFiles(
    packageFiles: string[],
  ): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = [];

    for (const filePath of packageFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const fileName = path.basename(filePath);

        if (fileName === 'package.json') {
          const packageJson = JSON.parse(content);
          packages.push({
            name: packageJson.name || 'unknown',
            version: packageJson.version || '0.0.0',
            license: packageJson.license,
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {},
          });
        }
        // Could add support for other package file formats here
      } catch (error) {
        console.warn(`⚠️ Failed to parse package file ${filePath}:`, error);
      }
    }

    return packages;
  }

  private async scanVulnerabilities(
    packages: PackageInfo[],
  ): Promise<Vulnerability[]> {
    console.log(
      `🔍 Scanning ${packages.length} packages for vulnerabilities...`,
    );

    const allVulnerabilities: Vulnerability[] = [];

    for (const pkg of packages) {
      // Check all dependencies
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [depName, depVersion] of Object.entries(allDeps)) {
        const cacheKey = `${depName}@${depVersion}`;

        // Check cache first
        let vulnerabilities = this.osvCache.get(cacheKey);

        if (!vulnerabilities) {
          // Query OSV database
          vulnerabilities = await this.queryOsvDatabase(depName, depVersion);

          // Cache results
          if (this.policy.scanning.cacheResults) {
            this.osvCache.set(cacheKey, vulnerabilities);

            // Clean up cache after TTL
            setTimeout(() => {
              this.osvCache.delete(cacheKey);
            }, this.policy.scanning.cacheTtl);
          }
        }

        allVulnerabilities.push(...vulnerabilities);
        this.metrics.vulnerabilitiesFound += vulnerabilities.length;
      }
    }

    console.log(`🔍 Found ${allVulnerabilities.length} vulnerabilities`);

    return allVulnerabilities;
  }

  private async queryOsvDatabase(
    packageName: string,
    version: string,
  ): Promise<Vulnerability[]> {
    try {
      // Simulate OSV API call
      await this.delay(100 + Math.random() * 200); // 100-300ms simulation

      // Simulate some vulnerabilities for common packages
      const vulnerabilities: Vulnerability[] = [];

      if (packageName.includes('lodash') && this.shouldSimulateVuln()) {
        vulnerabilities.push({
          id: 'OSV-2021-1234',
          summary: 'Prototype Pollution in lodash',
          severity: 'HIGH',
          cvssScore: 8.1,
          packageName,
          affectedVersions: ['<4.17.21'],
          fixedVersions: ['4.17.21'],
          publishedDate: '2021-02-15T00:00:00Z',
          modifiedDate: '2021-02-20T00:00:00Z',
          references: [
            'https://github.com/lodash/lodash/security/advisories/GHSA-example',
          ],
          cwe: ['CWE-1321'],
        });
      }

      if (packageName.includes('axios') && this.shouldSimulateVuln()) {
        vulnerabilities.push({
          id: 'OSV-2022-5678',
          summary: 'SSRF vulnerability in axios',
          severity: 'MODERATE',
          cvssScore: 6.5,
          packageName,
          affectedVersions: ['<0.28.0'],
          fixedVersions: ['0.28.0'],
          publishedDate: '2022-08-11T00:00:00Z',
          modifiedDate: '2022-08-15T00:00:00Z',
          references: [
            'https://github.com/axios/axios/security/advisories/GHSA-example',
          ],
          cwe: ['CWE-918'],
        });
      }

      return vulnerabilities;
    } catch (error) {
      console.warn(
        `⚠️ Failed to query OSV for ${packageName}@${version}:`,
        error,
      );
      return [];
    }
  }

  private async scanLicenses(packages: PackageInfo[]): Promise<LicenseInfo[]> {
    console.log(`📄 Scanning licenses for ${packages.length} packages...`);

    const licenseInfos: LicenseInfo[] = [];

    for (const pkg of packages) {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [depName, depVersion] of Object.entries(allDeps)) {
        const cacheKey = `${depName}@${depVersion}`;

        // Check cache first
        let licenseInfo = this.licenseCache.get(cacheKey);

        if (!licenseInfo) {
          // Analyze license
          licenseInfo = await this.analyzeLicense(depName, depVersion);

          // Cache results
          if (this.policy.scanning.cacheResults) {
            this.licenseCache.set(cacheKey, licenseInfo);

            setTimeout(() => {
              this.licenseCache.delete(cacheKey);
            }, this.policy.scanning.cacheTtl);
          }
        }

        licenseInfos.push(licenseInfo);
        this.metrics.licensesScanned++;
      }
    }

    console.log(`📄 Analyzed ${licenseInfos.length} licenses`);

    return licenseInfos;
  }

  private async analyzeLicense(
    packageName: string,
    version: string,
  ): Promise<LicenseInfo> {
    // Simulate license detection
    const commonLicenses = [
      'MIT',
      'Apache-2.0',
      'BSD-3-Clause',
      'ISC',
      'GPL-3.0',
      'UNKNOWN',
    ];
    const license =
      commonLicenses[Math.floor(Math.random() * commonLicenses.length)];

    let licenseType: LicenseInfo['licenseType'] = 'unknown';
    let allowlistStatus: LicenseInfo['allowlistStatus'] = 'denied';
    let riskLevel: LicenseInfo['riskLevel'] = 'medium';

    // Classify license
    if (
      ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'ISC'].includes(
        license,
      )
    ) {
      licenseType = 'permissive';
      riskLevel = 'low';
    } else if (
      ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0'].includes(
        license,
      )
    ) {
      licenseType = 'copyleft';
      riskLevel = 'high';
    } else if (license === 'UNKNOWN') {
      licenseType = 'unknown';
      riskLevel = 'high';
    }

    // Check allowlist status
    if (this.policy.licenses.allowlist.includes(license)) {
      allowlistStatus = 'allowed';
    } else if (this.policy.licenses.denylist.includes(license)) {
      allowlistStatus = 'denied';
    } else if (this.policy.licenses.requireApproval.includes(license)) {
      allowlistStatus = 'requires_approval';
    } else if (license === 'UNKNOWN' && this.policy.licenses.blockUnknown) {
      allowlistStatus = 'denied';
    } else {
      allowlistStatus = 'allowed'; // Default allow
    }

    return {
      license,
      packageName,
      version,
      licenseType,
      allowlistStatus,
      riskLevel,
    };
  }

  private async evaluateHealthPolicy(
    buildId: string,
    vulnerabilities: Vulnerability[],
    licenses: LicenseInfo[],
    startTime: number,
  ): Promise<HealthGateResult> {
    const blockers: HealthGateResult['blockers'] = [];
    const warnings: HealthGateResult['warnings'] = [];
    const activeExceptions: TTLException[] = [];

    // Evaluate vulnerabilities
    for (const vuln of vulnerabilities) {
      // Check for exceptions
      const exception = this.findActiveException('vulnerability', vuln.id);
      if (exception) {
        activeExceptions.push(exception);
        continue;
      }

      if (
        this.policy.vulnerabilities.blockSeverities.includes(vuln.severity) ||
        (vuln.cvssScore &&
          vuln.cvssScore > this.policy.vulnerabilities.maxCvssScore)
      ) {
        blockers.push({
          type: 'vulnerability',
          severity: vuln.severity,
          description: `${vuln.severity} vulnerability in ${vuln.packageName}: ${vuln.summary}`,
          remediation:
            vuln.fixedVersions.length > 0
              ? `Update to version ${vuln.fixedVersions[0]} or later`
              : `Review vulnerability ${vuln.id} and apply appropriate mitigation`,
        });
      } else if (
        this.policy.vulnerabilities.warnSeverities.includes(vuln.severity)
      ) {
        warnings.push({
          type: 'vulnerability',
          description: `${vuln.severity} vulnerability in ${vuln.packageName}: ${vuln.summary}`,
          remediation:
            vuln.fixedVersions.length > 0
              ? `Consider updating to version ${vuln.fixedVersions[0]} or later`
              : `Monitor vulnerability ${vuln.id} for updates`,
        });
      }
    }

    // Evaluate licenses
    for (const license of licenses) {
      // Check for exceptions
      const exception = this.findActiveException(
        'license',
        `${license.packageName}:${license.license}`,
      );
      if (exception) {
        activeExceptions.push(exception);
        continue;
      }

      if (license.allowlistStatus === 'denied') {
        blockers.push({
          type: 'license',
          severity: license.riskLevel.toUpperCase(),
          description: `Denied license ${license.license} in package ${license.packageName}`,
          remediation: `Remove package or find alternative with approved license`,
        });
      } else if (license.allowlistStatus === 'requires_approval') {
        warnings.push({
          type: 'license',
          description: `License ${license.license} in ${license.packageName} requires approval`,
          remediation: `Request license approval or create TTL exception`,
        });
      }
    }

    // Determine overall status
    let overallStatus: HealthGateResult['overallStatus'];

    if (blockers.length > 0) {
      if (
        this.policy.enforcement.mode === 'enforce' &&
        this.policy.enforcement.failOnBlockers
      ) {
        overallStatus = 'fail';
      } else {
        overallStatus = 'warn';
      }
    } else if (warnings.length > 0) {
      overallStatus = 'warn';
    } else {
      overallStatus = 'pass';
    }

    return {
      buildId,
      timestamp: Date.now(),
      overallStatus,
      vulnerabilities,
      licenses,
      blockers,
      warnings,
      exceptions: activeExceptions,
      executionTime: performance.now() - startTime,
    };
  }

  private findActiveException(
    type: 'vulnerability' | 'license',
    target: string,
  ): TTLException | undefined {
    for (const exception of this.exceptions.values()) {
      if (
        exception.type === type &&
        exception.target === target &&
        exception.expiresAt > Date.now()
      ) {
        return exception;
      }
    }
    return undefined;
  }

  private createEmptyResult(
    buildId: string,
    startTime: number,
  ): HealthGateResult {
    return {
      buildId,
      timestamp: Date.now(),
      overallStatus: 'pass',
      vulnerabilities: [],
      licenses: [],
      blockers: [],
      warnings: [],
      exceptions: [],
      executionTime: performance.now() - startTime,
    };
  }

  private updateMetrics(result: HealthGateResult): void {
    if (result.overallStatus === 'pass') {
      this.metrics.passedScans++;
    } else if (result.overallStatus === 'fail') {
      this.metrics.blockedScans++;
    }

    this.metrics.exceptionsUsed += result.exceptions.length;
    this.metrics.avgScanTime =
      (this.metrics.avgScanTime + result.executionTime) / 2;
  }

  private logResults(result: HealthGateResult): void {
    const status = result.overallStatus.toUpperCase();
    const statusEmoji =
      status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';

    console.log(`${statusEmoji} Health Gate ${status}: ${result.buildId}`);
    console.log(`   Execution time: ${result.executionTime.toFixed(1)}ms`);
    console.log(`   Vulnerabilities: ${result.vulnerabilities.length} found`);
    console.log(`   Licenses: ${result.licenses.length} scanned`);
    console.log(`   Blockers: ${result.blockers.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);
    console.log(`   Active exceptions: ${result.exceptions.length}`);

    // Log blockers
    if (result.blockers.length > 0) {
      console.log('🚫 BLOCKERS:');
      result.blockers.forEach((blocker, i) => {
        console.log(
          `   ${i + 1}. [${blocker.severity}] ${blocker.description}`,
        );
        console.log(`      💡 ${blocker.remediation}`);
      });
    }

    // Log warnings
    if (result.warnings.length > 0) {
      console.log('⚠️ WARNINGS:');
      result.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning.description}`);
        console.log(`      💡 ${warning.remediation}`);
      });
    }
  }

  private cleanupExpiredExceptions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, exception] of this.exceptions.entries()) {
      if (exception.expiresAt <= now) {
        this.exceptions.delete(id);
        cleaned++;

        console.log(
          `🧹 Expired exception: ${exception.target} (${exception.type})`,
        );

        this.emit('exception_expired', exception);
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired exceptions`);
    }
  }

  // Helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldSimulateVuln(): boolean {
    return Math.random() < 0.3; // 30% chance of simulated vulnerability
  }

  /**
   * Get health gate metrics
   */
  getMetrics(): typeof this.metrics & {
    activeExceptions: number;
    passingRate: number;
    blockingRate: number;
  } {
    return {
      ...this.metrics,
      activeExceptions: this.exceptions.size,
      passingRate:
        this.metrics.totalScans > 0
          ? this.metrics.passedScans / this.metrics.totalScans
          : 0,
      blockingRate:
        this.metrics.totalScans > 0
          ? this.metrics.blockedScans / this.metrics.totalScans
          : 0,
    };
  }

  /**
   * Get all active exceptions
   */
  getActiveExceptions(): TTLException[] {
    const now = Date.now();
    return Array.from(this.exceptions.values()).filter(
      (exc) => exc.expiresAt > now,
    );
  }

  /**
   * Get health gate policy
   */
  getPolicy(): HealthGatePolicy {
    return JSON.parse(JSON.stringify(this.policy)); // Deep copy
  }

  /**
   * Update enforcement mode
   */
  setEnforcementMode(mode: 'enforce' | 'warn' | 'audit'): void {
    console.log(
      `🛡️ Health Gate enforcement mode changed: ${this.policy.enforcement.mode} → ${mode}`,
    );
    this.policy.enforcement.mode = mode;
    this.emit('enforcement_mode_changed', mode);
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down dependency health gate...');

    // Clear caches
    this.osvCache.clear();
    this.licenseCache.clear();

    console.log('✅ Dependency health gate shut down');
  }
}

// Factory function
export function createDependencyHealthGate(
  policy: HealthGatePolicy,
): DependencyHealthGate {
  return new DependencyHealthGate(policy);
}

// Default policy configuration
export const DEFAULT_HEALTH_GATE_POLICY: HealthGatePolicy = {
  vulnerabilities: {
    blockSeverities: ['CRITICAL', 'HIGH'],
    warnSeverities: ['MODERATE'],
    allowSeverities: ['LOW', 'INFO'],
    maxCvssScore: 7.0,
    enableOsvScanning: true,
  },
  licenses: {
    allowlist: [
      'MIT',
      'Apache-2.0',
      'BSD-3-Clause',
      'BSD-2-Clause',
      'ISC',
      'Unlicense',
      'CC0-1.0',
    ],
    denylist: ['AGPL-3.0', 'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0'],
    requireApproval: ['MPL-2.0', 'EPL-2.0', 'CDDL-1.0'],
    blockUnknown: true,
    enableLicenseScanning: true,
  },
  enforcement: {
    mode: 'warn',
    failOnBlockers: false,
    allowTtlExceptions: true,
    maxExceptionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  scanning: {
    packageFiles: ['package.json', 'yarn.lock', 'package-lock.json'],
    cacheResults: true,
    cacheTtl: 3600000, // 1 hour
    timeout: 30000, // 30 seconds
  },
};
