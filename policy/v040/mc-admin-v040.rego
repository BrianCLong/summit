# MC Platform v0.4.0 OPA Policy - Transcendent Intelligence
# Policy-sandboxed evolution with extra safety guards

package mc.admin.v040

import future.keywords.if
import future.keywords.in

# === BASIC ACCESS CONTROL (v0.3.9 EXTENDED) ===

default allow = false

# Platform admin global access
allow {
    input.operation.isMutation
    input.actor.role == "platform-admin"
    input.transcendent_mode_enabled != true # Transcendent mode requires additional checks
}

# Tenant admin scoped access
allow {
    input.operation.isMutation
    input.actor.role == "tenant-admin"
    input.tenant == input.actor.tenant
    input.tenant != "ALL"
    input.transcendent_mode_enabled != true # Transcendent mode requires additional checks
}

# === TRANSCENDENT MODE AUTHORIZATION ===

# Transcendent operations require elevated authorization
allow {
    input.operation.isTranscendent
    input.actor.role in ["platform-admin", "transcendent-admin"]
    transcendent_mode_safety_checks
    sandbox_validation_passed
    human_oversight_check
}

# === EVOLUTION PROPOSAL SYSTEM ===

# Evolution proposals require sandbox validation
allow {
    input.operation.name == "proposeEvolution"
    input.actor.role in ["platform-admin", "tenant-admin", "evolution-engineer"]
    basic_evolution_checks
}

# Evolution approval requires elevated permissions
allow {
    input.operation.name == "approveEvolution"
    input.actor.role in ["platform-admin", "evolution-approver"]
    evolution_approval_checks
}

# Evolution application requires all validations
allow {
    input.operation.name == "applyEvolution"
    input.actor.role in ["platform-admin", "evolution-deployer"]
    evolution_application_checks
}

# Emergency rollback always allowed for authorized users
allow {
    input.operation.name == "rollbackEvolution"
    input.actor.role in ["platform-admin", "evolution-approver", "safety-officer"]
    emergency_rollback_checks
}

# === SAFETY GUARD FUNCTIONS ===

transcendent_mode_safety_checks {
    # HITL (Human-in-the-Loop) required for transcendent operations
    input.hitl_required == true
    input.human_oversight.enabled == true

    # Safety threshold enforcement
    input.safety_score >= 0.95

    # Containment readiness
    input.containment.emergency_rollback_ready == true
    input.containment.kill_switch_armed == true

    # Time-bounded operations
    time.now_ns() < input.operation.expiry_ns
}

sandbox_validation_passed {
    # Sandbox proofs required for all transcendent operations
    input.sandbox_results.opa_simulation_passed == true
    input.sandbox_results.test_coverage >= 0.85
    input.sandbox_results.cse_score >= 0.99
    input.sandbox_results.zk_fairness_proof.verified == true

    # Evidence stub must be cryptographically signed
    input.sandbox_results.evidence_stub != ""
    input.sandbox_results.signature_valid == true
}

human_oversight_check {
    # Human oversight required for high-risk operations
    input.human_oversight.enabled == true
    input.human_oversight.operator_id != ""

    # Approval chain for transcendent operations
    input.transcendent_approval.approver_count >= 2
    input.transcendent_approval.required_roles[_] == input.actor.role
}

# === EVOLUTION SYSTEM CHECKS ===

basic_evolution_checks {
    # Weight sum validation (must not exceed 1.0)
    evolution_weight_sum <= 1.0

    # Risk assessment required
    input.evolution_proposal.risk_assessment.overall_risk in ["LOW", "MEDIUM", "HIGH"]
    input.evolution_proposal.risk_assessment.safety_score >= 0.8

    # Strategy validation
    input.evolution_proposal.strategy in [
        "GRADUAL_IMPROVEMENT",
        "BREAKTHROUGH_DISCOVERY",
        "QUANTUM_ENHANCED_EVOLUTION",
        "TRANSCENDENT_CAPABILITY_EMERGENCE"
    ]
}

evolution_approval_checks {
    # Proposal must exist and be in correct state
    input.evolution_proposal.approval_status == "PENDING_REVIEW"
    input.evolution_proposal.sandbox_results.all_tests_passed == true

    # Approver authorization
    input.approver.clearance_level >= input.evolution_proposal.required_clearance

    # Conflict of interest check
    input.approver.id != input.evolution_proposal.proposer.id

    # Time-based approval window
    time.now_ns() < input.evolution_proposal.approval_deadline_ns
}

evolution_application_checks {
    # Proposal must be approved
    input.evolution_proposal.approval_status == "APPROVED"
    input.evolution_proposal.approved_by != ""

    # Additional safety validations for high-risk proposals
    high_risk_additional_checks if input.evolution_proposal.risk_assessment.overall_risk == "HIGH"

    # Rollback readiness
    input.rollback_plan.prepared == true
    input.rollback_plan.estimated_time_seconds <= 300
}

emergency_rollback_checks {
    # Emergency situations allow expedited rollback
    input.emergency.declared == true
    input.emergency.severity in ["HIGH", "CRITICAL"]

    # Or normal rollback with proper justification
    input.rollback_reason != ""
    count(input.rollback_reason) >= 10 # Minimum description length
}

high_risk_additional_checks {
    # Additional approvals for high-risk changes
    input.evolution_proposal.additional_approvals.safety_officer == true
    input.evolution_proposal.additional_approvals.security_lead == true

    # Extended testing requirements
    input.sandbox_results.extended_testing_passed == true
    input.sandbox_results.performance_regression_check == true

    # Canary deployment plan
    input.deployment_plan.canary_enabled == true
    input.deployment_plan.rollback_trigger_conditions != null
}

# === QUANTUM OPERATIONS AUTHORIZATION ===

# Quantum operations require quantum clearance
allow {
    input.operation.isQuantum
    input.actor.quantum_clearance >= input.operation.required_quantum_level
    quantum_safety_checks
}

quantum_safety_checks {
    # Quantum coherence requirements
    input.quantum.coherence_time_us >= 50.0
    input.quantum.error_rate <= 0.01

    # Entanglement safety
    input.quantum.max_entangled_qubits <= 1000
    input.quantum.decoherence_monitoring == true
}

# === AUTONOMY TIER ENFORCEMENT ===

# Autonomy operations bounded by tier
allow {
    input.operation.isAutonomous
    autonomy_tier_check
    autonomy_safety_limits
}

autonomy_tier_check {
    # Tier-based capability restrictions
    input.autonomy.current_tier <= input.actor.max_autonomy_tier

    # Tier-specific time limits
    tier_time_limits[input.autonomy.current_tier] >= input.operation.estimated_duration_seconds
}

autonomy_safety_limits {
    # Compensation monitoring (halt if >0.5%/24h)
    input.autonomy.compensation_rate_24h <= 0.005

    # Safety circuit breakers
    input.autonomy.safety_monitoring.enabled == true
    input.autonomy.safety_monitoring.last_check_ns > (time.now_ns() - 300000000000) # 5 minutes

    # Human intervention capability
    input.autonomy.human_override.available == true
    input.autonomy.human_override.response_time_seconds <= 60
}

# === PERFORMANCE AND COMPLIANCE HELPERS ===

evolution_weight_sum = sum([
    weight |
    some i
    input.evolution_proposal.capability_weights[i] = weight
])

tier_time_limits = {
    "TIER_1_SUPERVISED": 3600,    # 1 hour
    "TIER_2_GUIDED": 14400,       # 4 hours
    "TIER_3_AUTONOMOUS": 86400,   # 24 hours
    "TIER_4_TRANSCENDENT": 259200 # 72 hours (with additional oversight)
}

# === RESIDENCY AND PURPOSE ENFORCEMENT (ENHANCED) ===

# Geographic residency enforcement
residency_check {
    input.tenant_region == input.actor.region
    input.operation.data_residency_compliant == true

    # Enhanced for transcendent operations
    transcendent_residency_check if input.operation.isTranscendent
}

transcendent_residency_check {
    # Transcendent operations require additional residency validation
    input.transcendent.data_sovereignty.validated == true
    input.transcendent.cross_border_data_flow.approved == true
    input.transcendent.regulatory_compliance[input.tenant_region] == true
}

# Purpose limitation enforcement
purpose_check {
    input.operation.purpose in input.tenant.allowed_purposes

    # Enhanced purpose tracking for transcendent operations
    transcendent_purpose_check if input.operation.isTranscendent
}

transcendent_purpose_check {
    # Transcendent operations require explicit purpose declaration
    input.transcendent.declared_purpose != ""
    input.transcendent.purpose_alignment_verified == true
    input.transcendent.ethical_review_completed == true
}

# === AUDIT AND EVIDENCE REQUIREMENTS ===

# All transcendent operations must generate evidence
evidence_generation_required {
    input.operation.isTranscendent
    input.evidence_generation.enabled == true
    input.evidence_generation.cryptographic_signing == true
    input.evidence_generation.retention_period_years >= 7
}

# Post-quantum signature requirements
pq_signature_required {
    input.operation.isMutation
    input.security.post_quantum_signatures.enabled == true
    input.security.dual_signature_scheme == true # Ed25519 + Dilithium
}

# === EMERGENCY PROCEDURES ===

# Emergency containment always allowed for safety officers
allow {
    input.operation.name == "emergencyContainment"
    input.actor.role in ["platform-admin", "safety-officer", "emergency-responder"]
    emergency_containment_checks
}

emergency_containment_checks {
    # Emergency must be declared or imminent threat detected
    emergency_conditions_met

    # Containment type must be appropriate
    input.containment.type in ["PAUSE_EVOLUTION", "ROLLBACK_LAST", "EMERGENCY_STOP", "READ_ONLY_MODE"]

    # Evidence preservation
    input.containment.preserve_evidence == true
}

emergency_conditions_met {
    # Declared emergency
    input.emergency.status == "ACTIVE"

    # Or automated threat detection
    input.threat_detection.anomaly_score >= 0.8
    input.threat_detection.confidence >= 0.9

    # Or safety threshold breach
    input.safety_metrics.current_score < 0.7
}

# === TEST COVERAGE AND VALIDATION ===

# Deny operations with insufficient test coverage
deny[msg] {
    input.operation.isMutation
    input.operation.requires_testing == true
    input.test_results.coverage < 0.8
    msg := "Insufficient test coverage for mutation operation"
}

# Deny transcendent operations without sandbox validation
deny[msg] {
    input.operation.isTranscendent
    not sandbox_validation_passed
    msg := "Transcendent operation requires successful sandbox validation"
}

# Deny evolution without weight sum validation
deny[msg] {
    input.operation.name in ["proposeEvolution", "applyEvolution"]
    evolution_weight_sum > 1.0
    msg := sprintf("Evolution weight sum %.2f exceeds maximum 1.0", [evolution_weight_sum])
}

# Deny high-risk operations without additional approvals
deny[msg] {
    input.evolution_proposal.risk_assessment.overall_risk == "HIGH"
    input.operation.name == "applyEvolution"
    not high_risk_additional_checks
    msg := "High-risk evolution requires additional safety approvals"
}

# === MONITORING AND OBSERVABILITY ===

# Require monitoring for all transcendent operations
monitoring_required {
    input.operation.isTranscendent
    input.monitoring.real_time_enabled == true
    input.monitoring.alerting_configured == true
    input.monitoring.metrics_collection == true
}

# Performance SLA enforcement
performance_sla_check {
    input.performance.latency_p95_ms <= 350
    input.performance.error_rate <= 0.001
    input.performance.availability >= 0.999
}

# === POLICY METADATA ===

# Policy version and compatibility
policy_version = "v0.4.0"
compatible_api_versions = ["v0.3.9", "v0.4.0"]

# Required input fields for validation
required_fields = [
    "operation",
    "actor",
    "tenant",
    "timestamp"
]

# Enhanced required fields for transcendent operations
transcendent_required_fields = [
    "operation",
    "actor",
    "tenant",
    "timestamp",
    "sandbox_results",
    "human_oversight",
    "safety_score",
    "containment"
]