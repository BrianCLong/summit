import { dlpService } from '../../services/DLPService.js';
import fs from 'fs';
import path from 'path';

export interface ReleaseArtifacts {
  version: string;
  sbomPath: string;
  slsaPath: string;
  signaturePath?: string;
}

export interface GateResult {
  passed: boolean;
  reason?: string;
  artifacts?: ReleaseArtifacts;
  checks: {
    sbomExists: boolean;
    slsaExists: boolean;
    signed: boolean;
    governanceCompliant: boolean;
  };
}

export class ReleaseGate {
  private artifactsDir: string;

  constructor(artifactsDir: string = 'artifacts/sbom') {
    this.artifactsDir = artifactsDir;
  }

  async verifyRelease(version: string, tenantId: string = 'system'): Promise<GateResult> {
    const sbomPath = path.join(this.artifactsDir, `sbom-${version}.json`);
    const slsaPath = path.join(this.artifactsDir, `attestation-${version}.intoto.jsonl`);
    const sigPath = `${sbomPath}.sig`;

    const sbomExists = fs.existsSync(sbomPath);
    const slsaExists = fs.existsSync(slsaPath);
    // In real scenario, verify signature with cosign
    const signed = fs.existsSync(sigPath) || fs.existsSync(`${sbomPath}.cosign.sig`);

    // Governance Check: Simulate checking if DLP is active and policies are loaded
    // Explicitly scan a dummy artifact to verify DLP is functioning
    const dlpResult = await dlpService.scanContent(JSON.stringify({ test: "pii" }), {
        tenantId,
        userId: 'system',
        userRole: 'system',
        operationType: 'read',
        contentType: 'application/json'
    });

    const governanceCompliant = dlpService.listPolicies().length > 0 && dlpResult !== null;

    const passed = sbomExists && slsaExists && signed && governanceCompliant;

    return {
      passed,
      reason: passed ? 'All checks passed' : 'Missing artifacts or compliance failures',
      artifacts: passed ? {
        version,
        sbomPath,
        slsaPath,
        signaturePath: sigPath
      } : undefined,
      checks: {
        sbomExists,
        slsaExists,
        signed,
        governanceCompliant
      }
    };
  }
}

export const releaseGate = new ReleaseGate();
