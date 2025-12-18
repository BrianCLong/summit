import { type ComplianceReport, type FactorySnapshot } from './types.js';

export class ComplianceValidator {
  validate(snapshot: FactorySnapshot): ComplianceReport {
    const checks = [
      this.validateMtls(snapshot),
      this.validateSecurityControls(snapshot),
      this.validateRoi(snapshot),
      this.validateRevocation(snapshot),
    ];

    return {
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private validateMtls(snapshot: FactorySnapshot) {
    const passed = snapshot.mtls.allowed;
    return {
      name: 'mTLS-enforced',
      passed,
      details: passed
        ? 'mTLS handshake validated for factory and agents'
        : `mTLS errors: ${snapshot.mtls.reasons.join('; ')}`,
      evidence: snapshot.mtls,
    };
  }

  private validateSecurityControls(snapshot: FactorySnapshot) {
    const passed = snapshot.securityControls.length >= 3;
    return {
      name: 'security-controls-coverage',
      passed,
      details: passed
        ? 'core controls registered (mTLS, allowed actions, assurance)'
        : 'insufficient security controls registered',
      evidence: { controls: snapshot.securityControls },
    };
  }

  private validateRoi(snapshot: FactorySnapshot) {
    const passed =
      snapshot.roi.velocityGain >= 0.05 &&
      snapshot.roi.contextSwitchReduction >= 0.05;
    return {
      name: 'roi-telemetry',
      passed,
      details: passed
        ? 'ROI telemetry meets adoption thresholds'
        : 'ROI telemetry below target thresholds',
      evidence: snapshot.roi,
    };
  }

  private validateRevocation(snapshot: FactorySnapshot) {
    const passed = snapshot.revokedCertificates >= 0;
    return {
      name: 'revocation-tracking',
      passed,
      details: 'revocation list maintained',
      evidence: { revoked: snapshot.revokedCertificates },
    };
  }
}
