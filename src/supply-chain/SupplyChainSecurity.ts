#!/usr/bin/env node
/**
 * IntelGraph Maestro Composer vNext+5: Supply Chain Security
 *
 * Advanced supply chain security with vulnerability scanning, dependency verification,
 * SBOM generation, and license compliance checking.
 *
 * @author IntelGraph Maestro Composer
 * @version 5.0.0
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  package: string;
  version: string;
  description: string;
  cve?: string;
  cvss?: number;
  fixedIn?: string;
  patchAvailable: boolean;
}

interface SBOMComponent {
  type: string;
  bomRef: string;
  name: string;
  version: string;
  supplier?: {
    name: string;
    url?: string;
  };
  publisher?: string;
  purl?: string;
  hashes?: Array<{
    alg: string;
    content: string;
  }>;
  licenses?: Array<{
    license: {
      id?: string;
      name?: string;
      url?: string;
    };
  }>;
  vulnerabilities?: Vulnerability[];
}

interface SBOM {
  bomFormat: string;
  specVersion: string;
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: Array<{
      vendor: string;
      name: string;
      version: string;
    }>;
    component: {
      type: string;
      name: string;
      version: string;
    };
  };
  components: SBOMComponent[];
  vulnerabilities?: Vulnerability[];
}

interface LicenseCompliance {
  package: string;
  license: string;
  compatible: boolean;
  risk: 'low' | 'medium' | 'high';
  notes?: string;
}

interface SupplyChainPolicy {
  allowedLicenses: string[];
  blockedPackages: string[];
  maxVulnerabilityScore: number;
  requireSignedPackages: boolean;
  requireSBOM: boolean;
  autoUpdatePolicy: 'none' | 'patch' | 'minor' | 'major';
}

class SupplyChainSecurity extends EventEmitter {
  private vulnerabilityDb: Map<string, Vulnerability[]> = new Map();
  private licenseDb: Map<string, string> = new Map();
  private sbomStore: Map<string, SBOM> = new Map();
  private policies: Map<string, SupplyChainPolicy> = new Map();
  private scanResults: Map<string, SupplyChainScanResult> = new Map();

  // Performance tracking
  private metrics = {
    totalScans: 0,
    vulnerabilitiesFound: 0,
    vulnerabilitiesFixed: 0,
    licenseViolations: 0,
    blockedPackages: 0,
    sbomGenerated: 0,
    policyViolations: 0,
  };

  constructor() {
    super();
    this.initializeVulnerabilityDatabase();
    this.initializeLicenseDatabase();
    this.initializePolicies();
  }

  /**
   * Initialize vulnerability database with sample data
   */
  private initializeVulnerabilityDatabase(): void {
    // Sample vulnerabilities for common packages
    const vulnerabilities = [
      {
        id: 'SNYK-JS-LODASH-567746',
        severity: 'high' as const,
        package: 'lodash',
        version: '<4.17.21',
        description: 'Prototype Pollution in lodash',
        cve: 'CVE-2020-8203',
        cvss: 7.4,
        fixedIn: '4.17.21',
        patchAvailable: true,
      },
      {
        id: 'SNYK-JS-AXIOS-174505',
        severity: 'medium' as const,
        package: 'axios',
        version: '<0.21.1',
        description: 'Regular Expression Denial of Service (ReDoS)',
        cve: 'CVE-2020-28168',
        cvss: 5.3,
        fixedIn: '0.21.1',
        patchAvailable: true,
      },
      {
        id: 'SNYK-JS-REACT-1070199',
        severity: 'medium' as const,
        package: 'react',
        version: '<17.0.2',
        description: 'Cross-site Scripting (XSS)',
        cve: 'CVE-2021-23840',
        cvss: 6.1,
        fixedIn: '17.0.2',
        patchAvailable: true,
      },
    ];

    vulnerabilities.forEach((vuln) => {
      const existing = this.vulnerabilityDb.get(vuln.package) || [];
      existing.push(vuln);
      this.vulnerabilityDb.set(vuln.package, existing);
    });

    console.log(
      `🛡️  Loaded ${vulnerabilities.length} vulnerability signatures`,
    );
  }

  /**
   * Initialize license database
   */
  private initializeLicenseDatabase(): void {
    const licenses = new Map([
      ['MIT', 'MIT License'],
      ['Apache-2.0', 'Apache License 2.0'],
      ['GPL-3.0', 'GNU General Public License v3.0'],
      ['BSD-3-Clause', 'BSD 3-Clause "New" or "Revised" License'],
      ['ISC', 'ISC License'],
      ['LGPL-2.1', 'GNU Lesser General Public License v2.1'],
    ]);

    this.licenseDb = licenses;
    console.log(`📄 Loaded ${licenses.size} license definitions`);
  }

  /**
   * Initialize supply chain policies
   */
  private initializePolicies(): void {
    const defaultPolicy: SupplyChainPolicy = {
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
      blockedPackages: ['malicious-package', 'suspicious-lib'],
      maxVulnerabilityScore: 7.0,
      requireSignedPackages: true,
      requireSBOM: true,
      autoUpdatePolicy: 'patch',
    };

    const strictPolicy: SupplyChainPolicy = {
      allowedLicenses: ['MIT', 'Apache-2.0'],
      blockedPackages: [
        'malicious-package',
        'suspicious-lib',
        'gpl-licensed-lib',
      ],
      maxVulnerabilityScore: 4.0,
      requireSignedPackages: true,
      requireSBOM: true,
      autoUpdatePolicy: 'none',
    };

    this.policies.set('default', defaultPolicy);
    this.policies.set('strict', strictPolicy);

    console.log('📋 Supply chain policies initialized');
  }

  /**
   * Scan project dependencies for vulnerabilities
   */
  async scanDependencies(
    projectPath: string,
    policyName: string = 'default',
  ): Promise<SupplyChainScanResult> {
    const scanId = crypto.randomUUID();
    const startTime = Date.now();

    console.log(`\n🔍 Starting supply chain security scan: ${scanId}`);
    console.log(`   Project: ${projectPath}`);
    console.log(`   Policy: ${policyName}`);

    const policy = this.policies.get(policyName);
    if (!policy) {
      throw new Error(`Unknown policy: ${policyName}`);
    }

    // Mock dependency discovery
    const dependencies = this.discoverDependencies(projectPath);
    console.log(`   Dependencies found: ${dependencies.length}`);

    // Scan for vulnerabilities
    const vulnerabilities: Vulnerability[] = [];
    const licenseViolations: LicenseCompliance[] = [];
    const blockedPackages: string[] = [];

    for (const dep of dependencies) {
      // Check for vulnerabilities
      const depVulns = this.vulnerabilityDb.get(dep.name) || [];
      for (const vuln of depVulns) {
        if (this.isVersionAffected(dep.version, vuln.version)) {
          vulnerabilities.push({
            ...vuln,
            version: dep.version,
          });
        }
      }

      // Check license compliance
      if (dep.license && !policy.allowedLicenses.includes(dep.license)) {
        licenseViolations.push({
          package: dep.name,
          license: dep.license,
          compatible: false,
          risk: this.assessLicenseRisk(dep.license),
          notes: `License ${dep.license} not in allowed list`,
        });
      }

      // Check blocked packages
      if (policy.blockedPackages.includes(dep.name)) {
        blockedPackages.push(dep.name);
      }
    }

    // Filter high-severity vulnerabilities
    const highSeverityVulns = vulnerabilities.filter(
      (v) => v.cvss && v.cvss > policy.maxVulnerabilityScore,
    );

    // Generate SBOM
    const sbom = await this.generateSBOM(dependencies, vulnerabilities);

    const scanResult: SupplyChainScanResult = {
      scanId,
      timestamp: new Date().toISOString(),
      projectPath,
      policy: policyName,
      dependencies: dependencies.length,
      vulnerabilities: {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter((v) => v.severity === 'critical')
          .length,
        high: vulnerabilities.filter((v) => v.severity === 'high').length,
        medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
        low: vulnerabilities.filter((v) => v.severity === 'low').length,
        fixable: vulnerabilities.filter((v) => v.patchAvailable).length,
      },
      licenseViolations: licenseViolations.length,
      blockedPackages: blockedPackages.length,
      policyCompliant:
        highSeverityVulns.length === 0 &&
        licenseViolations.length === 0 &&
        blockedPackages.length === 0,
      sbom,
      duration: Date.now() - startTime,
      recommendations: this.generateRecommendations(
        vulnerabilities,
        licenseViolations,
        blockedPackages,
      ),
    };

    // Store results
    this.scanResults.set(scanId, scanResult);
    this.updateMetrics(scanResult);

    // Log summary
    console.log(`\n📊 Scan completed in ${scanResult.duration}ms:`);
    console.log(
      `   • Total vulnerabilities: ${scanResult.vulnerabilities.total}`,
    );
    console.log(
      `   • Critical: ${scanResult.vulnerabilities.critical}, High: ${scanResult.vulnerabilities.high}`,
    );
    console.log(`   • License violations: ${scanResult.licenseViolations}`);
    console.log(`   • Blocked packages: ${scanResult.blockedPackages}`);
    console.log(
      `   • Policy compliant: ${scanResult.policyCompliant ? '✅' : '❌'}`,
    );

    return scanResult;
  }

  /**
   * Generate Software Bill of Materials (SBOM)
   */
  async generateSBOM(
    dependencies: Dependency[],
    vulnerabilities: Vulnerability[],
  ): Promise<SBOM> {
    const serialNumber = `urn:uuid:${crypto.randomUUID()}`;

    const components: SBOMComponent[] = dependencies.map((dep) => ({
      type: 'library',
      bomRef: `pkg:npm/${dep.name}@${dep.version}`,
      name: dep.name,
      version: dep.version,
      supplier: dep.supplier
        ? {
            name: dep.supplier,
            url: dep.repository,
          }
        : undefined,
      purl: `pkg:npm/${dep.name}@${dep.version}`,
      hashes: dep.integrity
        ? [
            {
              alg: 'SHA-512',
              content: dep.integrity,
            },
          ]
        : undefined,
      licenses: dep.license
        ? [
            {
              license: {
                id: dep.license,
                name: this.licenseDb.get(dep.license),
              },
            },
          ]
        : undefined,
      vulnerabilities: vulnerabilities.filter((v) => v.package === dep.name),
    }));

    const sbom: SBOM = {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      serialNumber,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: 'IntelGraph',
            name: 'Maestro Composer',
            version: '5.0.0',
          },
        ],
        component: {
          type: 'application',
          name: 'intelgraph-project',
          version: '1.0.0',
        },
      },
      components,
      vulnerabilities,
    };

    // Store SBOM
    this.sbomStore.set(serialNumber, sbom);
    this.metrics.sbomGenerated++;

    console.log(`📦 Generated SBOM with ${components.length} components`);
    console.log(`   Serial: ${serialNumber}`);

    return sbom;
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(
    vulnerabilities: Vulnerability[],
    licenseViolations: LicenseCompliance[],
    blockedPackages: string[],
  ): string[] {
    const recommendations: string[] = [];

    // Vulnerability recommendations
    const fixableVulns = vulnerabilities.filter((v) => v.patchAvailable);
    if (fixableVulns.length > 0) {
      recommendations.push(
        `Update ${fixableVulns.length} packages to fix vulnerabilities`,
      );
    }

    const criticalVulns = vulnerabilities.filter(
      (v) => v.severity === 'critical',
    );
    if (criticalVulns.length > 0) {
      recommendations.push(
        `URGENT: Address ${criticalVulns.length} critical vulnerabilities immediately`,
      );
    }

    // License recommendations
    if (licenseViolations.length > 0) {
      recommendations.push(
        `Review ${licenseViolations.length} license compatibility issues`,
      );

      const highRiskLicenses = licenseViolations.filter(
        (l) => l.risk === 'high',
      );
      if (highRiskLicenses.length > 0) {
        recommendations.push(
          `Replace ${highRiskLicenses.length} packages with high-risk licenses`,
        );
      }
    }

    // Blocked packages
    if (blockedPackages.length > 0) {
      recommendations.push(
        `Remove ${blockedPackages.length} blocked packages from project`,
      );
    }

    return recommendations;
  }

  /**
   * Mock dependency discovery
   */
  private discoverDependencies(projectPath: string): Dependency[] {
    // Mock dependencies for demonstration
    return [
      {
        name: 'lodash',
        version: '4.17.20', // Vulnerable version
        license: 'MIT',
        supplier: 'Lodash Team',
        repository: 'https://github.com/lodash/lodash',
        integrity:
          'sha512-PlhdFcillOINfeV7Ni6oF1TAEayyZBoZ8bcshTHqOYJYlrqzRK5hagpagky5o4HfCzzd1TRkXPMFq6cKk9rGmA==',
      },
      {
        name: 'axios',
        version: '0.21.0', // Vulnerable version
        license: 'MIT',
        supplier: 'Matt Zabriskie',
        repository: 'https://github.com/axios/axios',
        integrity:
          'sha512-fmkJBknJKoZwem3/IKSSLpkdNXZeBu5Q7GA/aRsr2btgrptmSCxi2oFjZHqGdK9DoTil9PIHlPIZw2EcRJXRvw==',
      },
      {
        name: 'react',
        version: '17.0.1', // Vulnerable version
        license: 'MIT',
        supplier: 'Facebook',
        repository: 'https://github.com/facebook/react',
        integrity:
          'sha512-lG9c9UuMHdcAuCXxfgNl6/gLF0p8EfKGWxhYZCXxR+qF8mpLBWJXjZv4PjLdT8SH17YoJTZr1hv7V/0mIq2g0w==',
      },
      {
        name: 'express',
        version: '4.18.2',
        license: 'MIT',
        supplier: 'TJ Holowaychuk',
        repository: 'https://github.com/expressjs/express',
        integrity:
          'sha512-5/PsL6iGPdfQ/lKM1UuielYgv3BUoJfz1aUwU9vHZ+J7gyvwdQXFEBIEIaxeGf0GIcreATNyBExtalisDbuMqQ==',
      },
      {
        name: 'suspicious-lib',
        version: '1.0.0',
        license: 'GPL-3.0', // License violation
        supplier: 'Unknown',
        repository: 'https://github.com/suspicious/lib',
      },
    ];
  }

  /**
   * Check if version is affected by vulnerability
   */
  private isVersionAffected(
    currentVersion: string,
    affectedVersionRange: string,
  ): boolean {
    // Simplified version checking - in real implementation would use semver
    if (affectedVersionRange.startsWith('<')) {
      const maxVersion = affectedVersionRange.substring(1);
      return this.compareVersions(currentVersion, maxVersion) < 0;
    }
    return false;
  }

  /**
   * Simple version comparison
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;

      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }

    return 0;
  }

  /**
   * Assess license risk level
   */
  private assessLicenseRisk(license: string): 'low' | 'medium' | 'high' {
    const highRisk = ['GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'];
    const mediumRisk = ['GPL-2.0', 'LGPL-3.0', 'MPL-2.0'];

    if (highRisk.includes(license)) return 'high';
    if (mediumRisk.includes(license)) return 'medium';
    return 'low';
  }

  /**
   * Update metrics from scan result
   */
  private updateMetrics(result: SupplyChainScanResult): void {
    this.metrics.totalScans++;
    this.metrics.vulnerabilitiesFound += result.vulnerabilities.total;
    this.metrics.licenseViolations += result.licenseViolations;
    this.metrics.blockedPackages += result.blockedPackages;

    if (!result.policyCompliant) {
      this.metrics.policyViolations++;
    }
  }

  /**
   * Generate supply chain security report
   */
  async generateSupplyChainReport(): Promise<SupplyChainReport> {
    return {
      timestamp: new Date().toISOString(),
      totalScans: this.metrics.totalScans,
      vulnerabilityMetrics: {
        totalFound: this.metrics.vulnerabilitiesFound,
        totalFixed: this.metrics.vulnerabilitiesFixed,
        fixRate:
          this.metrics.vulnerabilitiesFound > 0
            ? this.metrics.vulnerabilitiesFixed /
              this.metrics.vulnerabilitiesFound
            : 0,
      },
      licenseCompliance: {
        violations: this.metrics.licenseViolations,
        complianceRate:
          this.metrics.totalScans > 0
            ? 1 - this.metrics.licenseViolations / this.metrics.totalScans
            : 1,
      },
      policyEnforcement: {
        violations: this.metrics.policyViolations,
        enforcementRate:
          this.metrics.totalScans > 0
            ? 1 - this.metrics.policyViolations / this.metrics.totalScans
            : 1,
      },
      sbomGeneration: {
        total: this.metrics.sbomGenerated,
        coverage: 1.0, // 100% SBOM generation
      },
    };
  }
}

// Supporting interfaces
interface Dependency {
  name: string;
  version: string;
  license?: string;
  supplier?: string;
  repository?: string;
  integrity?: string;
}

interface SupplyChainScanResult {
  scanId: string;
  timestamp: string;
  projectPath: string;
  policy: string;
  dependencies: number;
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    fixable: number;
  };
  licenseViolations: number;
  blockedPackages: number;
  policyCompliant: boolean;
  sbom: SBOM;
  duration: number;
  recommendations: string[];
}

interface SupplyChainReport {
  timestamp: string;
  totalScans: number;
  vulnerabilityMetrics: {
    totalFound: number;
    totalFixed: number;
    fixRate: number;
  };
  licenseCompliance: {
    violations: number;
    complianceRate: number;
  };
  policyEnforcement: {
    violations: number;
    enforcementRate: number;
  };
  sbomGeneration: {
    total: number;
    coverage: number;
  };
}

export {
  SupplyChainSecurity,
  type SBOM,
  type Vulnerability,
  type SupplyChainScanResult,
};
