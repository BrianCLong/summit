# Multi-Tenant ABAC (Attribute-Based Access Control) Policy
# Implements IC-grade multi-tenancy with comprehensive access controls
#
# Features:
# - Strict tenant isolation
# - Hierarchical role inheritance
# - Clearance-based access
# - Time-based controls
# - OT integration restrictions
# - Denied environment handling

package summit.multitenant

import rego.v1

# ============================================================================
# Default Deny - Explicit allow required
# ============================================================================

default allow := false
default tenant_access := false
default clearance_sufficient := false

# ============================================================================
# Main Allow Rules
# ============================================================================

# Global admin has full access
allow if {
    is_global_admin
    not system_lockdown
}

# Tenant admin within their tenant
allow if {
    is_tenant_admin
    tenant_access
    not denied_environment
    clearance_sufficient
}

# Regular access with all checks passing
allow if {
    tenant_access
    role_allows_action
    clearance_sufficient
    not denied_environment
    not requires_stepup
}

# Step-up authenticated access
allow if {
    requires_stepup
    stepup_verified
    tenant_access
    role_allows_action
    clearance_sufficient
    not denied_environment
}

# ============================================================================
# Tenant Isolation
# ============================================================================

tenant_access if {
    # Global admin can access any tenant
    is_global_admin
}

tenant_access if {
    # User belongs to the resource's tenant
    input.user.tenant_ids[_] == input.resource.tenant_id
}

tenant_access if {
    # Cross-tenant access explicitly approved
    input.cross_tenant_approved == true
    input.user.attributes.cross_tenant_authorized == true
}

# Deny cross-tenant access by default
deny if {
    not tenant_access
    input.resource.tenant_id != ""
}

# ============================================================================
# Role-Based Permissions
# ============================================================================

role_allows_action if {
    is_global_admin
}

role_allows_action if {
    # Check if any role grants the required permission
    some role in input.user.roles
    role.tenant_id == input.resource.tenant_id
    permission_granted(role.role, input.action, input.resource.type)
}

# Permission resolution with wildcards
permission_granted(role, action, resource_type) if {
    role_permissions[role][_] == "*"
}

permission_granted(role, action, resource_type) if {
    permission := sprintf("%s:%s", [resource_type, action])
    role_permissions[role][_] == permission
}

permission_granted(role, action, resource_type) if {
    wildcard := sprintf("%s:*", [resource_type])
    role_permissions[role][_] == wildcard
}

# Role permission definitions
role_permissions := {
    "global-admin": ["*"],
    "tenant-admin": [
        "tenant:manage",
        "user:read", "user:create", "user:update", "user:delete",
        "role:assign", "role:revoke",
        "audit:read", "audit:export",
        "config:read", "config:update",
        "investigation:*", "entity:*", "relationship:*",
        "analytics:*", "report:*"
    ],
    "supervisor": [
        "investigation:*", "entity:*", "relationship:*",
        "analytics:run", "analytics:export",
        "report:read", "report:create", "report:export",
        "team:manage", "copilot:query", "copilot:analyze"
    ],
    "analyst": [
        "investigation:read", "investigation:create", "investigation:update",
        "entity:read", "entity:create", "entity:update",
        "relationship:read", "relationship:create", "relationship:update",
        "analytics:run",
        "report:read", "report:create",
        "copilot:query", "copilot:analyze"
    ],
    "viewer": [
        "investigation:read",
        "entity:read",
        "relationship:read",
        "analytics:view",
        "report:read",
        "dashboard:view"
    ],
    "compliance-officer": [
        "audit:read", "audit:export",
        "report:read", "report:export",
        "policy:read",
        "sensitive:read",
        "dlp:override"
    ],
    "ot-integrator": [
        "ot:read", "ot:write", "ot:configure",
        "data:ingest", "data:transform",
        "pipeline:read", "pipeline:execute"
    ]
}

# ============================================================================
# Clearance Level Checks
# ============================================================================

clearance_sufficient if {
    not input.resource.classification
}

clearance_sufficient if {
    input.resource.classification == "unclassified"
}

clearance_sufficient if {
    clearance_levels[input.user.clearance] >= clearance_levels[input.resource.classification]
}

clearance_levels := {
    "unclassified": 0,
    "cui": 1,
    "confidential": 2,
    "secret": 3,
    "top-secret": 4,
    "top-secret-sci": 5
}

# Deny if clearance insufficient
deny if {
    input.resource.classification
    clearance_levels[input.user.clearance] < clearance_levels[input.resource.classification]
}

# ============================================================================
# Denied Environments and OT Restrictions
# ============================================================================

denied_environment if {
    # Check against explicitly denied environments
    env := input.context.denied_environments[_]
    startswith(input.action, env)
}

denied_environment if {
    # Check denied OT systems
    input.resource.type == "ot"
    denied_ot_system(input.resource.ot_system)
}

denied_ot_system(system) if {
    denied_systems := object.get(input.context, "denied_ot_systems", [])
    denied_systems[_] == system
}

# OT integration requires specific authorization
deny if {
    input.resource.type == "ot"
    not input.user.attributes.ot_authorization
}

# ============================================================================
# Step-Up Authentication
# ============================================================================

requires_stepup if {
    sensitive_action
}

requires_stepup if {
    sensitive_classification
}

requires_stepup if {
    privileged_operation
}

stepup_verified if {
    input.user.mfa_verified == true
    input.user.stepup_timestamp
    time.now_ns() - input.user.stepup_timestamp < stepup_ttl_ns
}

sensitive_action if {
    input.action in [
        "delete", "bulk_delete", "export", "bulk_export",
        "admin_action", "user_management", "config_change",
        "secret_access", "key_rotation"
    ]
}

sensitive_classification if {
    input.resource.classification in ["secret", "top-secret", "top-secret-sci"]
}

privileged_operation if {
    input.action in [
        "create_investigation", "delete_investigation",
        "modify_entity", "bulk_export", "admin_action",
        "role_assign", "role_revoke", "tenant_manage"
    ]
}

stepup_ttl_ns := 300 * 1000000000  # 5 minutes

# ============================================================================
# Admin Checks
# ============================================================================

is_global_admin if {
    input.user.global_roles[_] == "global-admin"
}

is_tenant_admin if {
    some role in input.user.roles
    role.tenant_id == input.resource.tenant_id
    role.role == "tenant-admin"
}

# ============================================================================
# System Lockdown
# ============================================================================

system_lockdown if {
    input.context.system_lockdown == true
    not input.user.global_roles[_] == "global-admin"
}

# ============================================================================
# Data Loss Prevention (DLP)
# ============================================================================

deny if {
    input.action == "export"
    sensitive_classification
    not dlp_override_authorized
}

deny if {
    input.action == "bulk_export"
    not is_global_admin
    not input.compliance_approved
}

dlp_override_authorized if {
    input.user.roles[_].role in ["global-admin", "tenant-admin", "compliance-officer"]
}

# ============================================================================
# Rate Limiting Policy
# ============================================================================

rate_limit_exceeded if {
    is_viewer
    input.user.hourly_request_count > 100
}

rate_limit_exceeded if {
    is_analyst
    input.user.hourly_request_count > 500
}

rate_limit_exceeded if {
    not is_global_admin
    input.user.hourly_request_count > 1000
}

is_viewer if {
    input.user.roles[_].role == "viewer"
}

is_analyst if {
    input.user.roles[_].role == "analyst"
}

deny if {
    rate_limit_exceeded
}

# ============================================================================
# Business Hours Enforcement
# ============================================================================

outside_business_hours if {
    hour := time.hour(time.now_ns())
    hour < 6
}

outside_business_hours if {
    hour := time.hour(time.now_ns())
    hour >= 22
}

deny if {
    input.context.enforce_business_hours == true
    outside_business_hours
    sensitive_classification
    not is_global_admin
}

# ============================================================================
# Audit Requirements
# ============================================================================

audit_required if {
    privileged_operation
}

audit_required if {
    sensitive_classification
}

audit_required if {
    input.action in ["export", "bulk_export", "delete", "bulk_delete"]
}

audit_required if {
    input.resource.type == "ot"
}

# ============================================================================
# Decision Output
# ============================================================================

decision := {
    "allow": allow,
    "deny_reasons": deny_reasons,
    "audit_required": audit_required,
    "stepup_required": requires_stepup,
    "obligations": obligations
}

deny_reasons := reasons if {
    not allow
    reasons := [reason |
        checks := [
            {"reason": "tenant_isolation_violation", "condition": not tenant_access},
            {"reason": "insufficient_permissions", "condition": not role_allows_action},
            {"reason": "clearance_insufficient", "condition": not clearance_sufficient},
            {"reason": "denied_environment", "condition": denied_environment},
            {"reason": "stepup_required", "condition": requires_stepup; not stepup_verified},
            {"reason": "rate_limit_exceeded", "condition": rate_limit_exceeded},
            {"reason": "system_lockdown", "condition": system_lockdown}
        ]
        check := checks[_]
        check.condition == true
        reason := check.reason
    ]
}

obligations := obs if {
    allow
    obs := [ob |
        audit_required
        ob := {"type": "audit", "level": "mandatory"}
    ]
}

# ============================================================================
# Policy Metadata
# ============================================================================

policy_metadata := {
    "version": "2.0.0",
    "name": "multi-tenant-abac",
    "description": "IC-grade multi-tenant ABAC policy",
    "last_updated": "2025-11-29T00:00:00Z",
    "features": [
        "tenant_isolation",
        "clearance_levels",
        "role_hierarchy",
        "stepup_auth",
        "denied_environments",
        "ot_integration",
        "dlp",
        "rate_limiting"
    ]
}
