# CompanyOS Authorization Policy
# Implements B1: OPA-Backed Authorization v1 (ABAC -> Real PDP)
#
# This policy provides comprehensive authorization for CompanyOS operations:
# - Tenant lifecycle operations (activate, suspend, delete)
# - Feature flag changes
# - Audit log viewer access
# - Administrative operations

package companyos.authz

import rego.v1

default decision := {"allow": false, "reason": "No matching policy rule"}

# ============================================================================
# MAIN DECISION
# ============================================================================

decision := result if {
    allow
    result := {
        "allow": true,
        "reason": "Access granted",
        "obligations": obligations,
        "audit_required": audit_required,
        "requires_mfa": requires_mfa,
    }
}

decision := result if {
    not allow
    result := {
        "allow": false,
        "reason": deny_reason,
        "obligations": [],
        "audit_required": true,
        "requires_mfa": false,
    }
}

# ============================================================================
# ALLOW RULES
# ============================================================================

# Global admins can do anything
allow if {
    is_global_admin
}

# Tenant lifecycle operations require specific permissions
allow if {
    tenant_lifecycle_allowed
}

# Feature flag operations
allow if {
    feature_flag_allowed
}

# Audit log viewer access
allow if {
    audit_viewer_allowed
}

# Standard tenant operations
allow if {
    standard_tenant_operation_allowed
}

# ============================================================================
# ROLE CHECKS
# ============================================================================

is_global_admin if {
    some role in input.subject.roles
    role == "global-admin"
}

is_tenant_admin if {
    some role in input.subject.roles
    role == "tenant-admin"
}

is_security_reviewer if {
    some role in input.subject.roles
    role == "SECURITY_REVIEWER"
}

is_operator if {
    some role in input.subject.roles
    role in {"operator", "tenant-admin", "global-admin"}
}

# ============================================================================
# TENANT LIFECYCLE AUTHORIZATION
# ============================================================================

lifecycle_actions := {
    "tenant:activate",
    "tenant:suspend",
    "tenant:delete",
    "tenant:delete:confirm",
    "tenant:create",
}

tenant_lifecycle_allowed if {
    input.action in lifecycle_actions
    is_operator
    tenant_scope_valid
}

# Only global-admin can delete confirmed
tenant_lifecycle_allowed if {
    input.action == "tenant:delete:confirm"
    is_global_admin
}

# ============================================================================
# FEATURE FLAG AUTHORIZATION
# ============================================================================

feature_flag_actions := {
    "feature_flag:read",
    "feature_flag:update",
    "feature_flag:create",
    "feature_flag:delete",
}

feature_flag_allowed if {
    input.action in feature_flag_actions
    is_tenant_admin
    tenant_scope_valid
}

feature_flag_allowed if {
    input.action == "feature_flag:read"
    tenant_scope_valid
}

# ============================================================================
# AUDIT VIEWER AUTHORIZATION (A3)
# ============================================================================

audit_actions := {
    "audit:read",
    "audit:export",
    "audit:query",
}

audit_viewer_allowed if {
    input.action in audit_actions
    is_security_reviewer
}

audit_viewer_allowed if {
    input.action in audit_actions
    is_tenant_admin
    tenant_scope_valid
}

# ============================================================================
# STANDARD TENANT OPERATIONS
# ============================================================================

standard_actions := {
    "tenant:read",
    "tenant:list",
    "tenant:update",
    "tenant:admin:list",
    "tenant:admin:assign",
    "tenant:onboarding:read",
    "tenant:onboarding:complete",
    "tenant:transitions:read",
}

standard_tenant_operation_allowed if {
    input.action in standard_actions
    tenant_scope_valid
    has_required_role
}

has_required_role if {
    some role in input.subject.roles
    role in {"viewer", "analyst", "tenant-admin", "global-admin", "operator"}
}

# ============================================================================
# TENANT SCOPE VALIDATION
# ============================================================================

tenant_scope_valid if {
    is_global_admin
}

tenant_scope_valid if {
    input.subject.tenant_id == input.resource.tenant_id
}

tenant_scope_valid if {
    not input.resource.tenant_id
}

# ============================================================================
# OBLIGATIONS
# ============================================================================

obligations contains obligation if {
    input.action in lifecycle_actions
    obligation := {
        "type": "audit",
        "parameters": {
            "level": "critical",
            "retain_days": 365,
        },
    }
}

obligations contains obligation if {
    input.action in {"tenant:delete", "tenant:delete:confirm"}
    obligation := {
        "type": "notify",
        "parameters": {
            "channels": ["security", "compliance"],
            "priority": "high",
        },
    }
}

# ============================================================================
# MFA REQUIREMENTS
# ============================================================================

mfa_required_actions := {
    "tenant:delete",
    "tenant:delete:confirm",
    "tenant:suspend",
    "audit:export",
}

requires_mfa if {
    input.action in mfa_required_actions
}

requires_mfa if {
    input.resource.classification in {"secret", "top-secret"}
}

# ============================================================================
# AUDIT REQUIREMENTS
# ============================================================================

audit_required if {
    input.action in lifecycle_actions
}

audit_required if {
    input.action in audit_actions
}

audit_required if {
    input.action in feature_flag_actions
    input.action != "feature_flag:read"
}

# ============================================================================
# DENY REASONS
# ============================================================================

deny_reason := "Tenant scope violation: cannot access resources from other tenants" if {
    not tenant_scope_valid
}

deny_reason := "Insufficient permissions for tenant lifecycle operation" if {
    input.action in lifecycle_actions
    not is_operator
}

deny_reason := "Security reviewer role required for audit access" if {
    input.action in audit_actions
    not is_security_reviewer
    not is_tenant_admin
}

deny_reason := "Tenant admin role required for feature flag management" if {
    input.action in feature_flag_actions
    input.action != "feature_flag:read"
    not is_tenant_admin
}

deny_reason := "MFA verification required" if {
    requires_mfa
    not input.subject.mfa_verified
}

deny_reason := "No matching permission" if {
    not is_global_admin
    not tenant_lifecycle_allowed
    not feature_flag_allowed
    not audit_viewer_allowed
    not standard_tenant_operation_allowed
}
