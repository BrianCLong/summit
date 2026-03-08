"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SBOMIntegration = void 0;
/**
 * Default federal license policy
 */
const DEFAULT_LICENSE_POLICY = {
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
const DEFAULT_VULN_THRESHOLD = {
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
class SBOMIntegration {
    licensePolicy;
    vulnThreshold;
    constructor(licensePolicy = DEFAULT_LICENSE_POLICY, vulnThreshold = DEFAULT_VULN_THRESHOLD) {
        this.licensePolicy = licensePolicy;
        this.vulnThreshold = vulnThreshold;
    }
    /**
     * Parse SBOM from CycloneDX JSON format
     */
    parseCycloneDX(sbomData) {
        const sbom = sbomData;
        const components = (sbom.components || []).map((c) => ({
            name: c.name,
            version: c.version,
            purl: c.purl,
            license: c.licenses?.[0]?.license?.id,
            supplier: c.supplier?.name,
        }));
        // Process vulnerabilities
        const vulnMap = new Map();
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
    parseSPDX(sbomData) {
        const sbom = sbomData;
        const components = (sbom.packages || []).map((p) => ({
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
    mapSeverity(severity) {
        const s = severity?.toLowerCase();
        if (s === 'critical') {
            return 'critical';
        }
        if (s === 'high') {
            return 'high';
        }
        if (s === 'medium' || s === 'moderate') {
            return 'medium';
        }
        return 'low';
    }
    /**
     * Count vulnerabilities by severity
     */
    countVulnerabilities(components) {
        const summary = {
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
    analyzeLicenses(components) {
        const licenseCount = new Map();
        for (const comp of components) {
            if (comp.license) {
                licenseCount.set(comp.license, (licenseCount.get(comp.license) || 0) + 1);
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
    isLicenseApproved(license) {
        return this.licensePolicy.approved.some((l) => l.toLowerCase() === license.toLowerCase());
    }
    /**
     * Check compliance against thresholds
     */
    checkCompliance(vulnerabilities, licenses) {
        const issues = [];
        // Check vulnerability thresholds
        const passesSecurityThreshold = vulnerabilities.critical <= this.vulnThreshold.maxCritical &&
            vulnerabilities.high <= this.vulnThreshold.maxHigh &&
            vulnerabilities.medium <= this.vulnThreshold.maxMedium &&
            vulnerabilities.total <= this.vulnThreshold.maxTotal;
        if (vulnerabilities.critical > this.vulnThreshold.maxCritical) {
            issues.push(`${vulnerabilities.critical} critical vulnerabilities exceed threshold of ${this.vulnThreshold.maxCritical}`);
        }
        if (vulnerabilities.high > this.vulnThreshold.maxHigh) {
            issues.push(`${vulnerabilities.high} high vulnerabilities exceed threshold of ${this.vulnThreshold.maxHigh}`);
        }
        // Check license compliance
        const deniedLicenses = licenses.filter((l) => this.licensePolicy.denied.some((d) => d.toLowerCase() === l.name.toLowerCase()));
        const reviewLicenses = licenses.filter((l) => this.licensePolicy.requiresReview.some((r) => r.toLowerCase() === l.name.toLowerCase()));
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
    generateAttestation(analysis) {
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
    setLicensePolicy(policy) {
        this.licensePolicy = policy;
    }
    /**
     * Update vulnerability thresholds
     */
    setVulnerabilityThreshold(threshold) {
        this.vulnThreshold = threshold;
    }
}
exports.SBOMIntegration = SBOMIntegration;
