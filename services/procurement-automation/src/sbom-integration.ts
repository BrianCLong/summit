import { SBOMReference } from './types.js';

/**
 * SBOM format types supported
 */
export type SBOMFormat = 'spdx-json' | 'spdx-yaml' | 'cyclonedx-json' | 'cyclonedx-xml';

/**
 * Vulnerability severity
 */
export interface VulnerabilitySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

/**
 * Component details from SBOM
 */
export interface SBOMComponent {
  name: string;
  version: string;
  purl?: string;
  license?: string;
  supplier?: string;
  vulnerabilities?: {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    fixedIn?: string;
  }[];
}

/**
 * SBOM analysis result
 */
export interface SBOMAnalysisResult {
  sbom: SBOMReference;
  components: SBOMComponent[];
  vulnerabilities: VulnerabilitySummary;
  licenses: {
    name: string;
    count: number;
    approved: boolean;
  }[];
  complianceStatus: {
    passesSecurityThreshold: boolean;
    passesLicensePolicy: boolean;
    requiresReview: boolean;
    issues: string[];
  };
}

/**
 * License policy for compliance
 */
export interface LicensePolicy {
  approved: string[];
  denied: string[];
  requiresReview: string[];
}

/**
 * Default federal license policy
 */
const DEFAULT_LICENSE_POLICY: LicensePolicy = {
  approved: [
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'ISC',
    'CC0-1.0',
    'Unlicense',
    'MPL-2.0',
    'LGPL-2.1',
    'LGPL-3.0',
    'PostgreSQL',
    'Python-2.0',
    'Zlib',
  ],
  denied: [
    'GPL-3.0',
    'AGPL-3.0',
    'SSPL-1.0',
    'Commons-Clause',
    'Elastic-2.0',
  ],
  requiresReview: [
    'GPL-2.0',
    'CDDL-1.0',
    'EPL-1.0',
    'EPL-2.0',
    'EUPL-1.1',
    'EUPL-1.2',
  ],
};

/**
 * Vulnerability thresholds for government compliance
 */
export interface VulnerabilityThreshold {
  maxCritical: number;
  maxHigh: number;
  maxMedium: number;
  maxTotal: number;
  maxAgeForCriticalDays: number;
  maxAgeForHighDays: number;
}

const DEFAULT_VULN_THRESHOLD: VulnerabilityThreshold = {
  maxCritical: 0,
  maxHigh: 0,
  maxMedium: 10,
  maxTotal: 50,
  maxAgeForCriticalDays: 15,
  maxAgeForHighDays: 30,
};

/**
 * SBOMIntegration - Integrates with existing SBOM generation infrastructure
 */
export class SBOMIntegration {
  private licensePolicy: LicensePolicy;
  private vulnThreshold: VulnerabilityThreshold;

  constructor(
    licensePolicy: LicensePolicy = DEFAULT_LICENSE_POLICY,
    vulnThreshold: VulnerabilityThreshold = DEFAULT_VULN_THRESHOLD,
  ) {
    this.licensePolicy = licensePolicy;
    this.vulnThreshold = vulnThreshold;
  }

  /**
   * Parse SBOM from CycloneDX JSON format
   */
  parseCycloneDX(sbomData: unknown): SBOMAnalysisResult {
    const sbom = sbomData as {
      bomFormat?: string;
      specVersion?: string;
      version?: number;
      metadata?: { timestamp?: string };
      components?: Array<{
        name: string;
        version: string;
        purl?: string;
        licenses?: Array<{ license?: { id?: string } }>;
        supplier?: { name?: string };
      }>;
      vulnerabilities?: Array<{
        id: string;
        ratings?: Array<{ severity?: string }>;
        affects?: Array<{ ref?: string }>;
      }>;
    };

    const components: SBOMComponent[] = (sbom.components || []).map((c) => ({
      name: c.name,
      version: c.version,
      purl: c.purl,
      license: c.licenses?.[0]?.license?.id,
      supplier: c.supplier?.name,
    }));

    // Process vulnerabilities
    const vulnMap = new Map<string, SBOMComponent['vulnerabilities']>();
    for (const v of sbom.vulnerabilities || []) {
      const severity = this.mapSeverity(v.ratings?.[0]?.severity);
      for (const affect of v.affects || []) {
        const existing = vulnMap.get(affect.ref || '') || [];
        existing.push({ id: v.id, severity });
        vulnMap.set(affect.ref || '', existing);
      }
    }

    // Attach vulnerabilities to components
    for (const comp of components) {
      comp.vulnerabilities = vulnMap.get(comp.purl || '') || [];
    }

    const vulnerabilities = this.countVulnerabilities(components);
    const licenses = this.analyzeLicenses(components);
    const complianceStatus = this.checkCompliance(vulnerabilities, licenses);

    return {
      sbom: {
        id: `sbom-${Date.now()}`,
        format: 'cyclonedx-json',
        version: String(sbom.version || '1'),
        generatedAt: sbom.metadata?.timestamp
          ? new Date(sbom.metadata.timestamp)
          : new Date(),
        components: components.length,
        vulnerabilities,
        licenses: licenses.map((l) => l.name),
      },
      components,
      vulnerabilities,
      licenses,
      complianceStatus,
    };
  }

  /**
   * Parse SBOM from SPDX JSON format
   */
  parseSPDX(sbomData: unknown): SBOMAnalysisResult {
    const sbom = sbomData as {
      spdxVersion?: string;
      creationInfo?: { created?: string };
      packages?: Array<{
        name: string;
        versionInfo?: string;
        licenseDeclared?: string;
        supplier?: string;
        externalRefs?: Array<{
          referenceType?: string;
          referenceLocator?: string;
        }>;
      }>;
    };

    const components: SBOMComponent[] = (sbom.packages || []).map((p) => ({
      name: p.name,
      version: p.versionInfo || 'unknown',
      purl: p.externalRefs?.find((r) => r.referenceType === 'purl')
        ?.referenceLocator,
      license: p.licenseDeclared,
      supplier: p.supplier,
    }));

    const vulnerabilities = this.countVulnerabilities(components);
    const licenses = this.analyzeLicenses(components);
    const complianceStatus = this.checkCompliance(vulnerabilities, licenses);

    return {
      sbom: {
        id: `sbom-${Date.now()}`,
        format: 'spdx-json',
        version: sbom.spdxVersion || 'SPDX-2.3',
        generatedAt: sbom.creationInfo?.created
          ? new Date(sbom.creationInfo.created)
          : new Date(),
        components: components.length,
        vulnerabilities,
        licenses: licenses.map((l) => l.name),
      },
      components,
      vulnerabilities,
      licenses,
      complianceStatus,
    };
  }

  /**
   * Map severity string to enum
   */
  private mapSeverity(
    severity?: string,
  ): 'critical' | 'high' | 'medium' | 'low' {
    const s = severity?.toLowerCase();
    if (s === 'critical') return 'critical';
    if (s === 'high') return 'high';
    if (s === 'medium' || s === 'moderate') return 'medium';
    return 'low';
  }

  /**
   * Count vulnerabilities by severity
   */
  private countVulnerabilities(
    components: SBOMComponent[],
  ): VulnerabilitySummary {
    const summary: VulnerabilitySummary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0,
    };

    for (const comp of components) {
      for (const vuln of comp.vulnerabilities || []) {
        summary[vuln.severity]++;
        summary.total++;
      }
    }

    return summary;
  }

  /**
   * Analyze licenses from components
   */
  private analyzeLicenses(
    components: SBOMComponent[],
  ): SBOMAnalysisResult['licenses'] {
    const licenseCount = new Map<string, number>();

    for (const comp of components) {
      if (comp.license) {
        licenseCount.set(
          comp.license,
          (licenseCount.get(comp.license) || 0) + 1,
        );
      }
    }

    return Array.from(licenseCount.entries()).map(([name, count]) => ({
      name,
      count,
      approved: this.isLicenseApproved(name),
    }));
  }

  /**
   * Check if license is approved
   */
  private isLicenseApproved(license: string): boolean {
    return this.licensePolicy.approved.some(
      (l) => l.toLowerCase() === license.toLowerCase(),
    );
  }

  /**
   * Check compliance against thresholds
   */
  private checkCompliance(
    vulnerabilities: VulnerabilitySummary,
    licenses: SBOMAnalysisResult['licenses'],
  ): SBOMAnalysisResult['complianceStatus'] {
    const issues: string[] = [];

    // Check vulnerability thresholds
    const passesSecurityThreshold =
      vulnerabilities.critical <= this.vulnThreshold.maxCritical &&
      vulnerabilities.high <= this.vulnThreshold.maxHigh &&
      vulnerabilities.medium <= this.vulnThreshold.maxMedium &&
      vulnerabilities.total <= this.vulnThreshold.maxTotal;

    if (vulnerabilities.critical > this.vulnThreshold.maxCritical) {
      issues.push(
        `${vulnerabilities.critical} critical vulnerabilities exceed threshold of ${this.vulnThreshold.maxCritical}`,
      );
    }
    if (vulnerabilities.high > this.vulnThreshold.maxHigh) {
      issues.push(
        `${vulnerabilities.high} high vulnerabilities exceed threshold of ${this.vulnThreshold.maxHigh}`,
      );
    }

    // Check license compliance
    const deniedLicenses = licenses.filter((l) =>
      this.licensePolicy.denied.some(
        (d) => d.toLowerCase() === l.name.toLowerCase(),
      ),
    );
    const reviewLicenses = licenses.filter((l) =>
      this.licensePolicy.requiresReview.some(
        (r) => r.toLowerCase() === l.name.toLowerCase(),
      ),
    );

    const passesLicensePolicy = deniedLicenses.length === 0;

    for (const denied of deniedLicenses) {
      issues.push(`Denied license found: ${denied.name} (${denied.count} packages)`);
    }

    const requiresReview = reviewLicenses.length > 0;
    for (const review of reviewLicenses) {
      issues.push(`License requires review: ${review.name} (${review.count} packages)`);
    }

    return {
      passesSecurityThreshold,
      passesLicensePolicy,
      requiresReview,
      issues,
    };
  }

  /**
   * Generate SBOM compliance attestation
   */
  generateAttestation(analysis: SBOMAnalysisResult): string {
    const date = new Date().toISOString();

    return `# SBOM Compliance Attestation

**Generated:** ${date}
**Format:** ${analysis.sbom.format}
**Components:** ${analysis.sbom.components}

## Vulnerability Summary

| Severity | Count |
|----------|-------|
| Critical | ${analysis.vulnerabilities.critical} |
| High | ${analysis.vulnerabilities.high} |
| Medium | ${analysis.vulnerabilities.medium} |
| Low | ${analysis.vulnerabilities.low} |
| **Total** | ${analysis.vulnerabilities.total} |

## License Summary

| License | Count | Approved |
|---------|-------|----------|
${analysis.licenses.map((l) => `| ${l.name} | ${l.count} | ${l.approved ? 'Yes' : 'No'} |`).join('\n')}

## Compliance Status

- Security Threshold: ${analysis.complianceStatus.passesSecurityThreshold ? 'PASS' : 'FAIL'}
- License Policy: ${analysis.complianceStatus.passesLicensePolicy ? 'PASS' : 'FAIL'}
- Requires Review: ${analysis.complianceStatus.requiresReview ? 'Yes' : 'No'}

${analysis.complianceStatus.issues.length > 0 ? `## Issues\n${analysis.complianceStatus.issues.map((i) => `- ${i}`).join('\n')}` : ''}

---
*Attestation generated by Procurement Automation Engine*
`;
  }

  /**
   * Update license policy
   */
  setLicensePolicy(policy: LicensePolicy): void {
    this.licensePolicy = policy;
  }

  /**
   * Update vulnerability thresholds
   */
  setVulnerabilityThreshold(threshold: VulnerabilityThreshold): void {
    this.vulnThreshold = threshold;
  }
}
