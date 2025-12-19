import { dlpService } from '../../services/DLPService.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { validateSupplyChainArtifacts } = require('../../../../scripts/supply-chain/supply-chain-artifacts.js');

export interface ReleaseArtifacts {
  version: string;
  sbomPaths: string[];
  provenancePath: string;
  auditPath: string;
}

export interface GateResult {
  passed: boolean;
  reason?: string;
  artifacts?: ReleaseArtifacts;
  checks: {
    sbomsPresent: boolean;
    provenancePresent: boolean;
    provenanceValid: boolean;
    dependencyAuditPassed: boolean;
    governanceCompliant: boolean;
  };
}

export class ReleaseGate {
  private artifactsDir: string;
  private provenancePath: string;
  private auditPath: string;

  constructor(
    artifactsDir: string = 'artifacts/sbom',
    provenancePath: string = 'artifacts/provenance.json',
    auditPath: string = 'artifacts/dependency-audit.json',
  ) {
    this.artifactsDir = artifactsDir;
    this.provenancePath = provenancePath;
    this.auditPath = auditPath;
  }

  async verifyRelease(version: string, tenantId: string = 'system'): Promise<GateResult> {
    const validation = validateSupplyChainArtifacts({
      commitSha: version,
      artifactsDir: this.artifactsDir,
      provenancePath: this.provenancePath,
      auditPath: this.auditPath,
    });

    const sbomTargets = validation.details?.targetArtifacts || [];
    const sbomsPresent = !validation.details?.missingTargets?.length;
    const provenancePresent = validation.details?.provenancePresent ?? false;
    const provenanceValid = validation.details?.provenanceValid ?? false;
    const dependencyAuditPassed = validation.details?.dependencyAuditPassed ?? false;

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

    const passed = validation.passed && governanceCompliant;

    const failureReasons = validation.reasons?.length ? validation.reasons.join('; ') : 'Missing artifacts or compliance failures';

    return {
      passed,
      reason: passed ? 'All checks passed' : failureReasons,
      artifacts: passed ? {
        version,
        sbomPaths: sbomTargets.map((target) => target.path),
        provenancePath: this.provenancePath,
        auditPath: this.auditPath,
      } : undefined,
      checks: {
        sbomsPresent,
        provenancePresent,
        provenanceValid,
        dependencyAuditPassed,
        governanceCompliant
      }
    };
  }
}

export const releaseGate = new ReleaseGate();
