# Zero-Trust Core Security Policy for IntelGraph
# Implements "never trust, always verify" principles for air-gapped deployments
package intelgraph.zerotrust.core

import rego.v1

# ============================================================================
# DEFAULT DENY - Core Zero-Trust Principle
# ============================================================================
default allow := false
default audit_decision := true

# ============================================================================
# IDENTITY VERIFICATION
# ============================================================================

# Verify workload identity through SPIFFE/SPIRE
identity_verified if {
    input.identity.spiffe_id != ""
    valid_spiffe_uri(input.identity.spiffe_id)
    not revoked_identity(input.identity.spiffe_id)
}

# Validate SPIFFE URI format for IntelGraph trust domain
valid_spiffe_uri(uri) if {
    startswith(uri, "spiffe://intelgraph.local/")
}

valid_spiffe_uri(uri) if {
    startswith(uri, "spiffe://intelgraph.airgap/")
}

# Check identity revocation list
revoked_identity(spiffe_id) if {
    data.revoked_identities[_] == spiffe_id
}

# ============================================================================
# CONTINUOUS VERIFICATION
# ============================================================================

# Session must be recently verified (within 5 minutes for sensitive ops)
session_fresh if {
    input.session.last_verified_ns > 0
    time_since_verification := time.now_ns() - input.session.last_verified_ns
    time_since_verification < 300000000000  # 5 minutes in nanoseconds
}

# Extended session for non-sensitive operations (15 minutes)
session_valid if {
    input.session.last_verified_ns > 0
    time_since_verification := time.now_ns() - input.session.last_verified_ns
    time_since_verification < 900000000000  # 15 minutes in nanoseconds
}

# ============================================================================
# DEVICE TRUST ASSESSMENT
# ============================================================================

# Device must meet security posture requirements
device_trusted if {
    input.device.registered == true
    input.device.compliance_score >= 0.8
    input.device.last_attestation_ns > 0
    attestation_age := time.now_ns() - input.device.last_attestation_ns
    attestation_age < 3600000000000  # 1 hour in nanoseconds
}

# Allow unregistered devices for read-only operations with enhanced monitoring
device_acceptable if {
    device_trusted
}

device_acceptable if {
    input.action in ["read", "list", "describe"]
    input.device.compliance_score >= 0.5
}

# ============================================================================
# TRUST SCORE CALCULATION
# ============================================================================

# Calculate overall trust score (0.0 - 1.0)
trust_score := score if {
    identity_score := identity_trust_component
    device_score := device_trust_component
    context_score := context_trust_component
    behavior_score := behavior_trust_component

    # Weighted trust calculation
    score := (identity_score * 0.35) + (device_score * 0.25) + (context_score * 0.2) + (behavior_score * 0.2)
}

identity_trust_component := 1.0 if {
    identity_verified
    input.identity.mfa_verified == true
}

identity_trust_component := 0.7 if {
    identity_verified
    not input.identity.mfa_verified
}

identity_trust_component := 0.0 if {
    not identity_verified
}

device_trust_component := score if {
    device_trusted
    score := input.device.compliance_score
}

device_trust_component := 0.3 if {
    not device_trusted
}

context_trust_component := 1.0 if {
    context_normal
}

context_trust_component := 0.5 if {
    not context_normal
    not context_anomalous
}

context_trust_component := 0.0 if {
    context_anomalous
}

behavior_trust_component := score if {
    score := input.behavior.anomaly_score
    score >= 0
    score <= 1
}

behavior_trust_component := 0.5 if {
    not input.behavior.anomaly_score
}

# ============================================================================
# CONTEXT ANALYSIS
# ============================================================================

context_normal if {
    location_expected
    time_expected
    not impossible_travel
}

context_anomalous if {
    impossible_travel
}

context_anomalous if {
    input.context.risk_indicators[_] == "high_risk_location"
}

location_expected if {
    input.context.location in data.allowed_locations
}

location_expected if {
    # Air-gapped deployments - only internal locations
    input.context.network_type == "airgapped"
    startswith(input.context.source_ip, "10.")
}

location_expected if {
    input.context.network_type == "airgapped"
    startswith(input.context.source_ip, "172.")
}

location_expected if {
    input.context.network_type == "airgapped"
    startswith(input.context.source_ip, "192.168.")
}

time_expected if {
    hour := (time.now_ns() / 1000000000 / 3600) % 24
    hour >= data.business_hours.start
    hour < data.business_hours.end
}

time_expected if {
    "24x7_access" in input.identity.permissions
}

impossible_travel if {
    input.context.previous_location != ""
    input.context.location != input.context.previous_location
    input.context.time_since_last_access_seconds < 3600
    # Physical impossibility - different locations within impossible timeframe
    data.location_distances[input.context.previous_location][input.context.location] > 500
}

# ============================================================================
# AUTHORIZATION DECISION
# ============================================================================

# Main authorization rule - implements zero-trust decision
allow if {
    identity_verified
    session_valid
    device_acceptable
    trust_score >= minimum_trust_for_action
    not explicitly_denied
    resource_access_permitted
}

# Minimum trust thresholds by action sensitivity
minimum_trust_for_action := 0.9 if {
    input.action in ["delete", "admin", "configure", "export_sensitive"]
}

minimum_trust_for_action := 0.7 if {
    input.action in ["write", "create", "update", "execute"]
}

minimum_trust_for_action := 0.5 if {
    input.action in ["read", "list", "describe"]
}

minimum_trust_for_action := 0.3 if {
    input.action == "health_check"
}

# ============================================================================
# EXPLICIT DENIALS
# ============================================================================

explicitly_denied if {
    input.identity.status == "suspended"
}

explicitly_denied if {
    input.identity.status == "revoked"
}

explicitly_denied if {
    input.context.source_ip in data.blocked_ips
}

explicitly_denied if {
    # Deny cross-tenant access
    input.resource.tenant_id != input.identity.tenant_id
    not cross_tenant_allowed
}

cross_tenant_allowed if {
    "cross_tenant_access" in input.identity.permissions
    input.resource.tenant_id in input.identity.allowed_tenants
}

# ============================================================================
# RESOURCE ACCESS CONTROL
# ============================================================================

resource_access_permitted if {
    rbac_allowed
    abac_allowed
    data_classification_allowed
}

rbac_allowed if {
    required_role := data.resource_roles[input.resource.type][input.action]
    required_role in input.identity.roles
}

rbac_allowed if {
    "admin" in input.identity.roles
}

abac_allowed if {
    # Check attribute-based conditions
    input.identity.clearance_level >= input.resource.required_clearance
}

abac_allowed if {
    input.resource.required_clearance == 0
}

data_classification_allowed if {
    input.identity.data_access_level >= data.classification_levels[input.resource.classification]
}

data_classification_allowed if {
    input.resource.classification == "public"
}

# ============================================================================
# AUDIT AND COMPLIANCE
# ============================================================================

audit_decision := true if {
    input.action in ["delete", "admin", "configure", "export_sensitive"]
}

audit_decision := true if {
    trust_score < 0.7
}

audit_decision := true if {
    input.resource.classification in ["secret", "top_secret", "confidential"]
}

audit_decision := true if {
    not allow
}

# Generate audit metadata
audit_metadata := {
    "timestamp": time.now_ns(),
    "identity": input.identity.spiffe_id,
    "action": input.action,
    "resource": input.resource.id,
    "decision": allow,
    "trust_score": trust_score,
    "reason": decision_reason,
    "session_id": input.session.id,
    "compliance_tags": compliance_tags
}

decision_reason := "access_granted" if {
    allow
}

decision_reason := "identity_not_verified" if {
    not identity_verified
}

decision_reason := "session_expired" if {
    identity_verified
    not session_valid
}

decision_reason := "device_not_trusted" if {
    identity_verified
    session_valid
    not device_acceptable
}

decision_reason := "insufficient_trust_score" if {
    identity_verified
    session_valid
    device_acceptable
    trust_score < minimum_trust_for_action
}

decision_reason := "explicitly_denied" if {
    explicitly_denied
}

decision_reason := "resource_access_denied" if {
    identity_verified
    session_valid
    device_acceptable
    trust_score >= minimum_trust_for_action
    not explicitly_denied
    not resource_access_permitted
}

compliance_tags := tags if {
    tags := [tag |
        compliance_check := data.compliance_requirements[_]
        compliance_check.condition
        tag := compliance_check.tag
    ]
}

# ============================================================================
# STEP-UP AUTHENTICATION
# ============================================================================

# Require step-up authentication for sensitive operations
step_up_required if {
    input.action in ["delete", "admin", "configure", "export_sensitive"]
    not input.identity.mfa_verified
}

step_up_required if {
    trust_score < 0.7
    trust_score >= 0.5
}

step_up_type := "mfa" if {
    step_up_required
    not input.identity.mfa_verified
}

step_up_type := "reauthentication" if {
    step_up_required
    input.identity.mfa_verified
    not session_fresh
}

# ============================================================================
# RESPONSE HEADERS FOR ENFORCEMENT
# ============================================================================

response := {
    "allow": allow,
    "audit_required": audit_decision,
    "audit_metadata": audit_metadata,
    "trust_score": trust_score,
    "step_up_required": step_up_required,
    "step_up_type": step_up_type,
    "decision_reason": decision_reason,
    "enforcement_actions": enforcement_actions
}

enforcement_actions := actions if {
    actions := [action |
        enforcement_rule := data.enforcement_rules[_]
        enforcement_rule.condition
        action := enforcement_rule.action
    ]
}
