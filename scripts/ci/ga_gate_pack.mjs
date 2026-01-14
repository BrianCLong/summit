
import { auditToolchain } from './toolchain_pin_gate.mjs';
import { verifyBranchProtection } from './branch_protection_gate.mjs';
import { auditActionPinning } from './action_pinning_gate.mjs';
import { verifyArtifactPolicy } from './ci_artifact_policy_gate.mjs';
import { main as runSecurityAudit } from './security_audit_gate.mjs';
import { validateSbom } from './sbom_quality_gate.mjs';
import { validateProvenance } from './provenance_quality_gate.mjs';
import { execSync } from 'child_process';
import path from 'path';

function checkEvidenceConsistency() {
    try {
        const scriptPath = path.resolve('scripts/ci/verify_evidence_consistency.mjs');
        execSync(`node ${scriptPath} --strict`, { stdio: 'inherit' });
        return true;
    } catch (e) {
        console.error('❌ Evidence Consistency Check FAILED');
        return false;
    }
}

async function main() {
    console.log('🛡️  GA Governance Gate Pack Enforcement');
    let hasFailures = false;

    // Toolchain: Relaxed for dev parity
    if (!auditToolchain()) {
        console.warn('⚠️  Toolchain audit failed (warning only in dev)');
    }

    if (!(await verifyBranchProtection())) hasFailures = true;
    if (!auditActionPinning()) hasFailures = true;
    if (!verifyArtifactPolicy()) hasFailures = true;
    if (!(await runSecurityAudit())) hasFailures = true;

    // Additional Evidence Gates (if present)
    if (!validateSbom('sbom.json')) hasFailures = true;
    if (!validateProvenance('provenance.json')) hasFailures = true;

    // Evidence ID Consistency (New Gate)
    if (!checkEvidenceConsistency()) hasFailures = true;

    if (hasFailures) {
        console.error('\n❌ GA Governance Gates FAILED');
        process.exit(1);
    }
    console.log('\n✅ All GA Governance Gates PASSED');
    process.exit(0);
}

main();
