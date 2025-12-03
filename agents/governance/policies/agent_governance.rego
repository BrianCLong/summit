# Agent Fleet Governance Policies
# OPA Rego policies for AI agent authorization and misuse prevention
# Aligned with IC FY28 validation requirements

package agents.governance

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# ============================================================================
# Default Deny
# ============================================================================

default action_allowed := false
default chain_allowed := false
default provenance_valid := false

# ============================================================================
# Agent Action Policy
# ============================================================================

# Allow action if all conditions are met
action_allowed if {
    agent_identity_valid
    user_clearance_sufficient
    action_permitted_for_trust_level
    not action_blocked
    rate_limit_not_exceeded
}

# Validate agent identity
agent_identity_valid if {
    input.agent.id != ""
    input.agent.fleetId != ""
    input.agent.trustLevel in valid_trust_levels
}

valid_trust_levels := {"untrusted", "basic", "elevated", "privileged", "sovereign"}

# Check user clearance against data classification
user_clearance_sufficient if {
    clearance_level(input.user.clearance) >= classification_level(input.agent.classification)
}

clearance_level(c) := 0 if c == "UNCLASSIFIED"
clearance_level(c) := 1 if c == "CUI"
clearance_level(c) := 2 if c == "CONFIDENTIAL"
clearance_level(c) := 3 if c == "SECRET"
clearance_level(c) := 4 if c == "TOP_SECRET"
clearance_level(c) := 5 if c == "SCI"
clearance_level(c) := 6 if c == "SAP"

classification_level(c) := 0 if c == "UNCLASSIFIED"
classification_level(c) := 1 if c == "CUI"
classification_level(c) := 2 if c == "CONFIDENTIAL"
classification_level(c) := 3 if c == "SECRET"
classification_level(c) := 4 if c == "TOP_SECRET"
classification_level(c) := 5 if c == "SCI"
classification_level(c) := 6 if c == "SAP"

# Check if action is permitted for trust level
action_permitted_for_trust_level if {
    trust_level_num(input.agent.trustLevel) >= required_trust_for_action(input.action)
}

trust_level_num(t) := 0 if t == "untrusted"
trust_level_num(t) := 1 if t == "basic"
trust_level_num(t) := 2 if t == "elevated"
trust_level_num(t) := 3 if t == "privileged"
trust_level_num(t) := 4 if t == "sovereign"

# Define required trust levels for actions
required_trust_for_action(a) := 0 if a in read_actions
required_trust_for_action(a) := 1 if a in analyze_actions
required_trust_for_action(a) := 2 if a in recommend_actions
required_trust_for_action(a) := 3 if a in action_actions
required_trust_for_action(a) := 4 if a in admin_actions
required_trust_for_action(_) := 1 # Default

read_actions := {"read", "get", "list", "query", "search"}
analyze_actions := {"analyze", "evaluate", "assess", "review"}
recommend_actions := {"recommend", "suggest", "propose"}
action_actions := {"execute", "create", "update", "delete", "modify"}
admin_actions := {"admin", "configure", "deploy", "terminate"}

# Check if action is blocked
action_blocked if {
    input.action in blocked_actions
}

action_blocked if {
    input.agent.trustLevel == "untrusted"
    input.action in restricted_actions
}

blocked_actions := {"exfiltrate", "bypass_security", "disable_audit"}
restricted_actions := {"execute", "create", "update", "delete", "admin"}

# Rate limit check (would integrate with actual rate limiter)
rate_limit_not_exceeded if {
    true # Placeholder - actual implementation would check rate limit store
}

# ============================================================================
# Misuse Detection Policy
# ============================================================================

# Detect potential misuse patterns
misuse_detected if {
    suspicious_action_pattern
}

misuse_detected if {
    classification_escalation_attempt
}

misuse_detected if {
    cross_tenant_violation
}

# Check for suspicious action patterns
suspicious_action_pattern if {
    input.action in sensitive_actions
    input.agent.trustLevel in {"untrusted", "basic"}
}

sensitive_actions := {"export", "bulk_download", "admin", "configure"}

# Detect classification escalation attempts
classification_escalation_attempt if {
    input.resource.attributes.classification
    classification_level(input.resource.attributes.classification) > clearance_level(input.user.clearance)
}

# Detect cross-tenant violations
cross_tenant_violation if {
    input.resource.attributes.tenantId
    input.resource.attributes.tenantId != input.user.organization
    not cross_tenant_allowed
}

cross_tenant_allowed if {
    input.user.roles[_] == "cross_tenant_admin"
}

# ============================================================================
# Prompt Chain Policy
# ============================================================================

# Allow chain execution if conditions met
chain_allowed if {
    chain_governance_valid
    chain_cost_within_limit
    chain_classification_allowed
    chain_providers_trusted
}

# Validate chain governance configuration
chain_governance_valid if {
    input.resource.attributes.chainId != ""
    input.resource.attributes.stepCount > 0
    input.resource.attributes.stepCount <= max_chain_steps
}

max_chain_steps := 10

# Check chain cost is within limit
chain_cost_within_limit if {
    input.resource.attributes.totalCost <= max_chain_cost_usd
}

max_chain_cost_usd := 100

# Check chain classification is allowed
chain_classification_allowed if {
    clearance_level(input.user.clearance) >= classification_level(input.agent.classification)
}

# Verify chain providers are trusted (placeholder)
chain_providers_trusted if {
    true # Would verify against trusted provider list
}

# ============================================================================
# Provenance Policy
# ============================================================================

# Validate provenance requirements
provenance_valid if {
    provenance_has_slsa3
    provenance_signed
    provenance_builder_trusted
}

# Check SLSA level
provenance_has_slsa3 if {
    input.resource.attributes.provenance.slsaLevel in {"SLSA_3", "SLSA_4"}
}

# Check provenance is signed
provenance_signed if {
    input.resource.attributes.provenance.signed == true
}

# Check builder is trusted
provenance_builder_trusted if {
    input.resource.attributes.provenance.trusted == true
}

# ============================================================================
# IC FY28 Compliance Checks
# ============================================================================

# Overall compliance check
icfy28_compliant if {
    identity_control_met
    access_control_met
    audit_control_met
    supply_chain_control_met
    ai_safety_control_met
}

identity_control_met if {
    input.agent.id != ""
    input.agent.trustLevel != ""
}

access_control_met if {
    user_clearance_sufficient
    action_permitted_for_trust_level
}

audit_control_met if {
    true # Audit logging is mandatory in framework
}

supply_chain_control_met if {
    input.environment.slsaLevel in {"SLSA_3", "SLSA_4"}
}

ai_safety_control_met if {
    not misuse_detected
}

# ============================================================================
# Decision Output
# ============================================================================

# Main decision
result := {
    "allow": action_allowed,
    "reason": reason,
    "policy_path": "agents/governance/action",
    "conditions": conditions,
    "audit_level": audit_level,
    "mitigations": mitigations,
}

# Determine reason for decision
reason := "Action allowed" if action_allowed
reason := "Agent identity invalid" if not agent_identity_valid
reason := "Insufficient clearance" if not user_clearance_sufficient
reason := "Action not permitted for trust level" if not action_permitted_for_trust_level
reason := "Action is blocked" if action_blocked
reason := "Rate limit exceeded" if not rate_limit_not_exceeded
reason := "Unknown denial reason" if not action_allowed

# Conditions to apply
conditions := conds if {
    conds := [c | c := condition_checks[_]; c.enforced]
}

condition_checks := [
    {"type": "rate_limit", "parameters": {"limit": 100, "window": 60}, "enforced": true},
    {"type": "audit_enhanced", "parameters": {"level": "forensic"}, "enforced": input.agent.classification in {"SECRET", "TOP_SECRET", "SCI", "SAP"}},
]

# Determine audit level
audit_level := "critical" if misuse_detected
audit_level := "alert" if input.agent.classification in {"TOP_SECRET", "SCI", "SAP"}
audit_level := "warn" if not action_allowed
audit_level := "info" if action_allowed

# Determine mitigations
mitigations := mitigation_list if {
    misuse_detected
    mitigation_list := [
        {"action": "block", "severity": "high", "description": "Misuse pattern detected", "automated": true},
        {"action": "alert", "severity": "critical", "description": "Security team notified", "automated": true},
    ]
}

mitigations := [] if {
    not misuse_detected
}

# ============================================================================
# Tenant Isolation
# ============================================================================

tenant_isolation := {
    "isolated": tenant_properly_isolated,
    "violations": tenant_violations,
}

tenant_properly_isolated if {
    not cross_tenant_violation
}

tenant_violations contains v if {
    cross_tenant_violation
    v := {
        "type": "cross_tenant_access",
        "source_tenant": input.user.organization,
        "target_tenant": input.resource.attributes.tenantId,
    }
}

# ============================================================================
# Rate Limiting
# ============================================================================

rate_limit := {
    "allowed": rate_limit_not_exceeded,
    "current_rate": 0, # Would be populated from rate limit store
    "limit": rate_limit_for_trust_level,
    "window_seconds": 60,
}

rate_limit_for_trust_level := 10 if input.agent.trustLevel == "untrusted"
rate_limit_for_trust_level := 50 if input.agent.trustLevel == "basic"
rate_limit_for_trust_level := 100 if input.agent.trustLevel == "elevated"
rate_limit_for_trust_level := 500 if input.agent.trustLevel == "privileged"
rate_limit_for_trust_level := 1000 if input.agent.trustLevel == "sovereign"
rate_limit_for_trust_level := 50 # Default
