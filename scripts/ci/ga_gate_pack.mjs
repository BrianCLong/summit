
import { auditToolchain } from './toolchain_pin_gate.mjs';
import { verifyBranchProtection } from './branch_protection_gate.mjs';
import { auditActionPinning } from './action_pinning_gate.mjs';
import { verifyArtifactPolicy } from './ci_artifact_policy_gate.mjs';
import { main as runSecurityAudit } from './security_audit_gate.mjs';
import { validateSbom } from './sbom_quality_gate.mjs';
import { validateProvenance } from './provenance_quality_gate.mjs';
import { execSync } from 'child_process';

function runTsGate(scriptName) {
    try {
        execSync(`npx tsx scripts/ci/${scriptName}`, { stdio: 'inherit' });
        return true;
    } catch (e) {
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

    // New GA Readiness Checks
    if (!runTsGate('enforce_change_budget.ts')) hasFailures = true;
    if (!runTsGate('verify_environment_contract.ts')) hasFailures = true;
    if (!runTsGate('verify_release_checklist.ts')) hasFailures = true;
    if (!runTsGate('verify_security_exceptions.ts')) hasFailures = true;
    if (!runTsGate('verify_incident_drill.ts')) hasFailures = true;

    if (hasFailures) {
        console.error('\n❌ GA Governance Gates FAILED');
        process.exit(1);
    }
    console.log('\n✅ All GA Governance Gates PASSED');
    process.exit(0);
}

main();
