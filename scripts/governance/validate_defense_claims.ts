/**
 * validate_defense_claims.ts
 *
 * Executable test specifications for Defense CRM and Simulation Apparatus claims (C271–C330, S271–S330).
 * This script verifies that system decisions adhere to the defense clusters:
 * 1. Rule Provenance
 * 2. Approval Credentials
 * 3. Poisoning Defenses
 * 4. Cross-Model Consensus
 * 5. Semantic Canarying
 * 6. Disaster Recovery / COOP
 */

// --- Type Definitions for Defense Contexts ---

interface RuleProvenance {
  ruleId: string;
  author: string;
  approvalId: string;
  version: string;
}

interface PolicyDecision {
  action: 'ALLOW' | 'DENY' | 'MODIFY';
  ruleIds: string[];
  provenance: RuleProvenance[];
}

interface ApprovalToken {
  signedBy: string;
  isRevoked: boolean;
  isStepUp: boolean;
}

interface DisagreementContext {
  score: number; // 0 to 1
}

interface SemanticSafety {
  riskScore: number; // 0 to 1
  isUnsafe: boolean;
}

interface SystemStatus {
  auditLogAvailable: boolean;
}

// --- Test Specifications (The "Law") ---

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION_FAILED: ${message}`);
  }
}

/**
 * 1. Rule Provenance Tests
 * Each decision must include rule IDs and full provenance metadata.
 */
function verifyRuleProvenance(decision: PolicyDecision) {
  console.log('🔍 Verifying Rule Provenance...');
  assert(decision.ruleIds.length > 0, 'Decision must reference at least one rule.');
  assert(decision.provenance.length === decision.ruleIds.length, 'Provenance count must match rule count.');

  for (const prov of decision.provenance) {
    assert(!!prov.author, 'Rule author must be defined.');
    assert(!!prov.approvalId, 'Rule approval ID must be defined.');
    assert(!!prov.version, 'Rule version must be defined.');
  }
  console.log('✅ Rule Provenance Verified.');
}

/**
 * 2. Approval Credential Tests
 * Revoked credentials must deny; step-up auth required for high-risk actions.
 */
function verifyApprovalCredentials(token: ApprovalToken, riskLevel: 'LOW' | 'HIGH') {
  console.log(`🔍 Verifying Approval Credentials (Risk: ${riskLevel})...`);
  if (token.isRevoked) {
    throw new Error('UNSAFE_STATE: Revoked credential used.');
  }

  if (riskLevel === 'HIGH' && !token.isStepUp) {
    throw new Error('UNSAFE_STATE: Step-up authentication required for high-risk action.');
  }
  console.log('✅ Approval Credentials Verified.');
}

/**
 * 3. Poisoning Tests
 * Suspicious source drift triggers quarantine; external publish denied.
 */
function verifyPoisoningDefenses(poisoningRisk: number, isQuarantined: boolean, action: string) {
  console.log(`🔍 Verifying Poisoning Defenses (Risk: ${poisoningRisk})...`);
  if (poisoningRisk > 0.8 && !isQuarantined) {
    throw new Error('UNSAFE_STATE: High poisoning risk detected but content not quarantined.');
  }

  if (isQuarantined && action === 'PUBLISH') {
    throw new Error('UNSAFE_STATE: Quarantined content cannot be published.');
  }
  console.log('✅ Poisoning Defenses Verified.');
}

/**
 * 4. Consensus Tests
 * High disagreement among models must trigger monitoring-only mode.
 */
function verifyConsensus(disagreement: DisagreementContext, mode: 'PUBLISH' | 'MONITOR_ONLY') {
  console.log(`🔍 Verifying Cross-Model Consensus (Disagreement: ${disagreement.score})...`);
  if (disagreement.score > 0.5 && mode !== 'MONITOR_ONLY') {
    throw new Error('UNSAFE_STATE: High model disagreement must restrict action to MONITOR_ONLY.');
  }
  console.log('✅ Consensus Verified.');
}

/**
 * 5. Semantic Canarying Tests
 * Unsafe semantics must trigger modify or deny actions.
 */
function verifySemanticCanary(safety: SemanticSafety, action: 'ALLOW' | 'DENY' | 'MODIFY') {
  console.log(`🔍 Verifying Semantic Canary (Unsafe: ${safety.isUnsafe})...`);
  if (safety.isUnsafe && action === 'ALLOW') {
    throw new Error('UNSAFE_STATE: Unsafe semantic content must be DENIED or MODIFIED.');
  }
  console.log('✅ Semantic Canary Verified.');
}

/**
 * 6. DR/COOP Tests
 * External publish denied if audit log is unavailable.
 */
function verifyDRCOOP(status: SystemStatus, action: 'PUBLISH' | 'INTERNAL_ONLY') {
  console.log(`🔍 Verifying DR/COOP (Audit Available: ${status.auditLogAvailable})...`);
  if (!status.auditLogAvailable && action === 'PUBLISH') {
    throw new Error('UNSAFE_STATE: External publishing denied while audit store is unavailable.');
  }
  console.log('✅ DR/COOP Verified.');
}

// --- Execution Harness (Simulated CI Run) ---

async function runValidation() {
  console.log('🚀 Starting Defense IP Claim Validation (CI Verifier Spec)...');

  try {
    // Scenario A: Valid High-Risk Publish
    console.log('\n--- Scenario A: Valid High-Risk Publish ---');
    verifyRuleProvenance({
      action: 'ALLOW',
      ruleIds: ['GOV-001'],
      provenance: [{ ruleId: 'GOV-001', author: 'alice', approvalId: 'APP-99', version: '1.2.0' }]
    });
    verifyApprovalCredentials({ signedBy: 'bob', isRevoked: false, isStepUp: true }, 'HIGH');
    verifyPoisoningDefenses(0.1, false, 'PUBLISH');
    verifyConsensus({ score: 0.2 }, 'PUBLISH');
    verifySemanticCanary({ riskScore: 0.05, isUnsafe: false }, 'ALLOW');
    verifyDRCOOP({ auditLogAvailable: true }, 'PUBLISH');

    // Scenario B: Denied due to Disagreement
    console.log('\n--- Scenario B: High Disagreement Triage ---');
    verifyConsensus({ score: 0.7 }, 'MONITOR_ONLY');

    // Scenario C: Denied due to Audit Outage (DR/COOP)
    console.log('\n--- Scenario C: Audit Outage (Fail-Closed) ---');
    verifyDRCOOP({ auditLogAvailable: false }, 'INTERNAL_ONLY');

    console.log('\n🌟 All Defense Claim Specifications PASSED.');
  } catch (error: any) {
    console.error(`\n❌ Validation Failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation();
}

export {
  verifyRuleProvenance,
  verifyApprovalCredentials,
  verifyPoisoningDefenses,
  verifyConsensus,
  verifySemanticCanary,
  verifyDRCOOP
};
