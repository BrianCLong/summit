import future.keywords
# CompanyOS Identity Fabric - Step-Up Authentication Policy
# Version: 1.0.0
#
# Defines when step-up authentication is required based on:
# - Action sensitivity
# - Resource classification
# - Risk assessment
# - Session state

package companyos.authz.stepup

import rego.v1

# ============================================================================
# Step-Up Decision
# ============================================================================

default stepup_required := false
default stepup_verified := false

# ============================================================================
# When Step-Up is Required
# ============================================================================

stepup_required if {
    sensitive_action
}

stepup_required if {
    sensitive_resource
}

stepup_required if {
    high_risk_context
}

stepup_required if {
    privileged_operation
}

stepup_required if {
    elevated_access_requested
}

stepup_required if {
    unusual_behavior_detected
}

# ============================================================================
# Sensitive Actions
# ============================================================================

sensitive_action if {
    input.action in sensitive_actions
}

sensitive_actions := [
    # Administrative actions
    "user_create",
    "user_delete",
    "user_modify_permissions",
    "role_assign",
    "role_revoke",
    "tenant_modify",
    "policy_modify",

    # Data destruction
    "delete",
    "bulk_delete",
    "purge",
    "archive",

    # Data export
    "export",
    "bulk_export",
    "download_sensitive",

    # Security operations
    "key_rotation",
    "secret_access",
    "audit_modify",
    "config_change",

    # Financial operations
    "payment_process",
    "refund_issue",
    "budget_modify",

    # Integration operations
    "webhook_create",
    "api_key_create",
    "service_account_create"
]

# ============================================================================
# Sensitive Resources
# ============================================================================

sensitive_resource if {
    input.resource.classification in ["secret", "top-secret", "top-secret-sci"]
}

sensitive_resource if {
    "critical" in input.resource.tags
}

sensitive_resource if {
    "pii" in input.resource.tags
    input.action in ["read", "export", "modify"]
}

sensitive_resource if {
    input.resource.type in sensitive_resource_types
}

sensitive_resource_types := [
    "secret",
    "credential",
    "key",
    "certificate",
    "audit_log",
    "financial_record",
    "personnel_file",
    "legal_document"
]

# ============================================================================
# Risk-Based Step-Up
# ============================================================================

high_risk_context if {
    input.subject.risk_score > 0.6
}

high_risk_context if {
    new_device
}

high_risk_context if {
    unusual_location
}

high_risk_context if {
    unusual_time
}

high_risk_context if {
    concurrent_sessions_exceeded
}

new_device if {
    input.environment.device_trust == "untrusted"
}

new_device if {
    input.environment.device_known == false
}

unusual_location if {
    input.environment.location_anomaly == true
}

unusual_location if {
    input.environment.geo_velocity_anomaly == true
}

unusual_time if {
    input.environment.time_anomaly == true
}

concurrent_sessions_exceeded if {
    input.subject.active_sessions > 3
}

# ============================================================================
# Privileged Operations
# ============================================================================

privileged_operation if {
    "admin" in input.subject.roles
    input.action in admin_sensitive_actions
}

privileged_operation if {
    input.action in always_privileged_actions
}

admin_sensitive_actions := [
    "impersonate",
    "override",
    "bypass",
    "emergency_access"
]

always_privileged_actions := [
    "system_config_change",
    "security_policy_modify",
    "compliance_override",
    "disaster_recovery_invoke"
]

# ============================================================================
# Elevated Access
# ============================================================================

elevated_access_requested if {
    input.request.elevated_access == true
}

elevated_access_requested if {
    input.request.scope in elevated_scopes
}

elevated_scopes := [
    "admin",
    "superuser",
    "system",
    "emergency"
]

# ============================================================================
# Behavioral Anomaly Detection
# ============================================================================

unusual_behavior_detected if {
    input.subject.failed_auth_attempts > 2
    time_since_last_failure_minutes < 30
}

unusual_behavior_detected if {
    input.subject.permission_denied_count > 5
    time_since_last_denial_minutes < 60
}

unusual_behavior_detected if {
    input.subject.api_calls_last_hour > input.tenant.quotas.api_calls_per_hour * 0.8
}

time_since_last_failure_minutes := minutes if {
    input.subject.last_auth_failure_timestamp
    diff_ns := time.now_ns() - input.subject.last_auth_failure_timestamp
    minutes := diff_ns / (60 * 1000000000)
}

time_since_last_failure_minutes := 9999 if {
    not input.subject.last_auth_failure_timestamp
}

time_since_last_denial_minutes := minutes if {
    input.subject.last_permission_denied_timestamp
    diff_ns := time.now_ns() - input.subject.last_permission_denied_timestamp
    minutes := diff_ns / (60 * 1000000000)
}

time_since_last_denial_minutes := 9999 if {
    not input.subject.last_permission_denied_timestamp
}

# ============================================================================
# Step-Up Verification
# ============================================================================

stepup_verified if {
    input.subject.stepup_completed == true
    stepup_not_expired
    stepup_scope_matches
}

stepup_not_expired if {
    input.subject.stepup_expires_at
    input.subject.stepup_expires_at > time.now_ns() / 1000000
}

stepup_scope_matches if {
    required_scope := get_required_scope
    required_scope in input.subject.stepup_scopes
}

stepup_scope_matches if {
    "*" in input.subject.stepup_scopes
}

get_required_scope := scope if {
    sensitive_action
    scope := "sensitive_action"
}

get_required_scope := scope if {
    sensitive_resource
    not sensitive_action
    scope := "sensitive_resource"
}

get_required_scope := scope if {
    privileged_operation
    scope := "privileged"
}

get_required_scope := scope if {
    high_risk_context
    not sensitive_action
    not sensitive_resource
    not privileged_operation
    scope := "high_risk"
}

get_required_scope := "general" if {
    not sensitive_action
    not sensitive_resource
    not privileged_operation
    not high_risk_context
}

# ============================================================================
# Step-Up Method Requirements
# ============================================================================

# Determine required step-up method based on context
required_method := "webauthn" if {
    input.resource.classification in ["top-secret", "top-secret-sci"]
}

required_method := "webauthn" if {
    privileged_operation
    input.action in ["system_config_change", "security_policy_modify"]
}

required_method := "totp" if {
    stepup_required
    not required_method == "webauthn"
}

# Step-up TTL based on sensitivity
stepup_ttl_seconds := 60 if {
    input.resource.classification in ["top-secret", "top-secret-sci"]
}

stepup_ttl_seconds := 300 if {
    input.resource.classification in ["secret", "confidential"]
}

stepup_ttl_seconds := 600 if {
    high_risk_context
    not sensitive_resource
}

stepup_ttl_seconds := 900 if {
    stepup_required
    not sensitive_resource
    not high_risk_context
}

# ============================================================================
# Decision Output
# ============================================================================

decision := {
    "stepup_required": stepup_required,
    "stepup_verified": stepup_verified,
    "required_method": required_method,
    "ttl_seconds": stepup_ttl_seconds,
    "required_scope": get_required_scope,
    "reason": reason,
    "risk_factors": risk_factors
}

reason := "No step-up required" if {
    not stepup_required
}

reason := "Sensitive action requires step-up" if {
    stepup_required
    sensitive_action
}

reason := "Sensitive resource requires step-up" if {
    stepup_required
    sensitive_resource
    not sensitive_action
}

reason := "High risk context requires step-up" if {
    stepup_required
    high_risk_context
    not sensitive_action
    not sensitive_resource
}

reason := "Privileged operation requires step-up" if {
    stepup_required
    privileged_operation
}

risk_factors := factors if {
    factors := [factor |
        checks := [
            {"factor": "new_device", "condition": new_device},
            {"factor": "unusual_location", "condition": unusual_location},
            {"factor": "unusual_time", "condition": unusual_time},
            {"factor": "high_risk_score", "condition": input.subject.risk_score > 0.6},
            {"factor": "concurrent_sessions", "condition": concurrent_sessions_exceeded},
            {"factor": "recent_failures", "condition": unusual_behavior_detected}
        ]
        check := checks[_]
        check.condition == true
        factor := check.factor
    ]
}

# ============================================================================
# Policy Metadata
# ============================================================================

policy_metadata := {
    "version": "1.0.0",
    "name": "companyos-stepup",
    "description": "Step-Up Authentication Policy for CompanyOS",
    "last_updated": "2025-01-01T00:00:00Z"
}
