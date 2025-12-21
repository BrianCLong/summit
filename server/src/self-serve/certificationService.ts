import { createHash } from 'crypto';
import { ConnectorCandidate, CertificationResult, DeploymentProfile } from './types.js';

const requiredCapabilities = ['ingest', 'query'];

export class CertificationService {
  certifyConnectors(connectors: ConnectorCandidate[]): CertificationResult[] {
    return connectors.map((connector) => {
      const issues: string[] = [];
      const scoreParts: number[] = [];
      const hasVersion = /\d+\.\d+\.\d+/.test(connector.version);
      if (!hasVersion) {
        issues.push('Version must follow semantic versioning');
      } else {
        scoreParts.push(20);
      }

      const capabilityHits = requiredCapabilities.filter((cap) => connector.capabilities.includes(cap)).length;
      if (capabilityHits !== requiredCapabilities.length) {
        issues.push('Missing required capabilities: ingest + query');
      }
      scoreParts.push(capabilityHits * 20);

      if (connector.signedBy) {
        scoreParts.push(20);
      } else {
        issues.push('Connector package must be signed');
      }

      const passed = issues.length === 0;
      const score = Math.min(100, scoreParts.reduce((acc, value) => acc + value, 40));
      const badgeId = this.computeBadgeId(`connector:${connector.name}:${connector.version}:${passed}`);

      return {
        subject: connector.name,
        passed,
        score,
        badgeId,
        issues,
        artifactUrl: `https://ci.intelgraph.local/certifications/${badgeId}.json`,
      };
    });
  }

  certifyDeploymentProfile(profile: DeploymentProfile): CertificationResult {
    const issues: string[] = [];
    if (profile.controls.rateLimitPerMinute < 60) {
      issues.push('Rate limit too low for self-serve pathways');
    }
    if (!profile.controls.auditEnabled) {
      issues.push('Audit logging must be enabled');
    }
    if (!profile.controls.sandboxed) {
      issues.push('Sandboxing is mandatory for self-serve evaluations');
    }
    if (!profile.controls.encryptedAtRest) {
      issues.push('Encryption at rest is required');
    }
    if (profile.supportedRegions.length === 0) {
      issues.push('At least one supported region is required');
    }

    const passed = issues.length === 0;
    const score = Math.max(0, 100 - issues.length * 10);
    const badgeId = this.computeBadgeId(`deployment:${profile.name}:${profile.isolation}:${passed}`);

    return {
      subject: profile.name,
      passed,
      score,
      badgeId,
      issues,
      artifactUrl: `https://ci.intelgraph.local/certifications/${badgeId}.json`,
    };
  }

  private computeBadgeId(seed: string): string {
    return createHash('sha256').update(seed).digest('hex').slice(0, 16);
  }
}
