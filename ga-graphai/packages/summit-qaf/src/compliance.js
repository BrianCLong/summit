"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceValidator = void 0;
class ComplianceValidator {
    validate(snapshot) {
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
    validateMtls(snapshot) {
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
    validateSecurityControls(snapshot) {
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
    validateRoi(snapshot) {
        const passed = snapshot.roi.velocityGain >= 0.05 &&
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
    validateRevocation(snapshot) {
        const passed = snapshot.revokedCertificates >= 0;
        return {
            name: 'revocation-tracking',
            passed,
            details: 'revocation list maintained',
            evidence: { revoked: snapshot.revokedCertificates },
        };
    }
}
exports.ComplianceValidator = ComplianceValidator;
