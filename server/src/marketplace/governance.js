"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorScanner = void 0;
const types_js_1 = require("./types.js");
class ConnectorScanner {
    async scanArtifact(artifactId, artifactContent) {
        // Mock implementation for scanning
        // In a real implementation, this would call external tools (Trivy, etc.)
        const isVulnerable = artifactContent.includes('CRITICAL_CVE');
        const license = artifactContent.includes('LICENSE: MIT') ? types_js_1.LicenseType.MIT : types_js_1.LicenseType.UNKNOWN;
        return {
            artifactId,
            license,
            securityStatus: isVulnerable ? types_js_1.SecurityStatus.CRITICAL : types_js_1.SecurityStatus.SAFE,
            trustTier: types_js_1.TrustTier.UNVERIFIED,
            cves: isVulnerable ? ['CVE-2025-0001'] : [],
            lastScannedAt: new Date(),
            quarantined: isVulnerable,
            quarantineReason: isVulnerable ? 'Critical CVE detected' : undefined,
        };
    }
    async evaluatePolicy(governance) {
        const reasons = [];
        let allowed = true;
        if (governance.securityStatus === types_js_1.SecurityStatus.CRITICAL) {
            allowed = false;
            reasons.push('Artifact has critical vulnerabilities.');
        }
        if (governance.license === types_js_1.LicenseType.UNKNOWN) {
            allowed = false;
            reasons.push('Artifact license is unknown.');
        }
        return {
            id: `decision-${Date.now()}`,
            artifactId: governance.artifactId,
            policyId: 'default-marketplace-policy',
            allowed,
            reasons,
            timestamp: new Date(),
        };
    }
}
exports.ConnectorScanner = ConnectorScanner;
