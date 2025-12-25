import { MarketplaceArtifactGovernance, LicenseType, SecurityStatus, TrustTier, PolicyDecision } from './types.js';

export class ConnectorScanner {
  async scanArtifact(artifactId: string, artifactContent: string): Promise<MarketplaceArtifactGovernance> {
    // Mock implementation for scanning
    // In a real implementation, this would call external tools (Trivy, etc.)

    const isVulnerable = artifactContent.includes('CRITICAL_CVE');
    const license = artifactContent.includes('LICENSE: MIT') ? LicenseType.MIT : LicenseType.UNKNOWN;

    return {
      artifactId,
      license,
      securityStatus: isVulnerable ? SecurityStatus.CRITICAL : SecurityStatus.SAFE,
      trustTier: TrustTier.UNVERIFIED,
      cves: isVulnerable ? ['CVE-2025-0001'] : [],
      lastScannedAt: new Date(),
      quarantined: isVulnerable,
      quarantineReason: isVulnerable ? 'Critical CVE detected' : undefined,
    };
  }

  async evaluatePolicy(governance: MarketplaceArtifactGovernance): Promise<PolicyDecision> {
    const reasons: string[] = [];
    let allowed = true;

    if (governance.securityStatus === SecurityStatus.CRITICAL) {
      allowed = false;
      reasons.push('Artifact has critical vulnerabilities.');
    }

    if (governance.license === LicenseType.UNKNOWN) {
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
