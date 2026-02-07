import future.keywords
# CompanyOS Identity Fabric - Attribute-Based Access Control Policy
# Version: 1.0.0
#
# This policy implements comprehensive ABAC for all CompanyOS resources.
# It evaluates access based on:
# - Subject attributes (roles, clearance, groups, risk score)
# - Resource attributes (classification, owner, tags)
# - Environment attributes (time, location, device trust)
# - Tenant context (isolation, quotas, features)

package companyos.authz.abac

import rego.v1

# ============================================================================
# Default Deny - All access must be explicitly granted
# ============================================================================

default allow := false
default deny := false

# ============================================================================
# Main Authorization Decision
# ============================================================================

# Allow if all conditions are met
allow if {
    not deny
    tenant_access_valid
    role_permits_action
    clearance_sufficient
    not requires_stepup
}

# Allow with step-up verified
allow if {
    not deny
    tenant_access_valid
    role_permits_action
    clearance_sufficient
    requires_stepup
    stepup_verified
}

# ============================================================================
# Explicit Deny Rules (take precedence)
# ============================================================================

# Deny if tenant isolation violated
deny if {
    tenant_isolation_violated
}

# Deny if identity is inactive
deny if {
    input.subject.active == false
}

# Deny if resource classification exceeds clearance
deny if {
    clearance_insufficient
}

# Deny if in denied environment
deny if {
    environment_denied
}

# Deny if rate limit exceeded
deny if {
    rate_limit_exceeded
}

# Deny if high risk score without step-up
deny if {
    input.subject.risk_score > 0.8
    not input.subject.stepup_verified
}

# ============================================================================
# Tenant Isolation
# ============================================================================

tenant_access_valid if {
    # Subject belongs to resource tenant
    input.subject.tenant_id == input.resource.tenant_id
}

tenant_access_valid if {
    # Global admin can access any tenant
    "global-admin" in input.subject.roles
}

tenant_access_valid if {
    # Explicit cross-tenant authorization
    input.subject.attributes.cross_tenant_authorized == true
    input.resource.tenant_id in input.subject.attributes.authorized_tenants
}

tenant_isolation_violated if {
    input.subject.tenant_id != input.resource.tenant_id
    not "global-admin" in input.subject.roles
    not input.subject.attributes.cross_tenant_authorized
}

# ============================================================================
# Role-Based Permission Checks
# ============================================================================

role_permits_action if {
    # Check if any role grants the required permission
    some role in input.subject.roles
    permission_for_action(role, input.action, input.resource.type)
}

# Permission resolution with wildcards
permission_for_action(role, action, resource_type) if {
    role_permissions[role][_] == "*"
}

permission_for_action(role, action, resource_type) if {
    permission := sprintf("%s:%s", [resource_type, action])
    role_permissions[role][_] == permission
}

permission_for_action(role, action, resource_type) if {
    wildcard := sprintf("%s:*", [resource_type])
    role_permissions[role][_] == wildcard
}

# Role permission definitions
role_permissions := {
    "global-admin": ["*"],
    "tenant-admin": [
        "tenant:*",
        "user:*",
        "role:*",
        "audit:*",
        "config:*",
        "investigation:*",
        "entity:*",
        "relationship:*",
        "analytics:*",
        "report:*",
        "export:read",
        "export:create"
    ],
    "supervisor": [
        "investigation:*",
        "entity:*",
        "relationship:*",
        "analytics:run",
        "analytics:export",
        "report:*",
        "team:manage",
        "copilot:*"
    ],
    "analyst": [
        "investigation:read",
        "investigation:create",
        "investigation:update",
        "entity:read",
        "entity:create",
        "entity:update",
        "relationship:read",
        "relationship:create",
        "relationship:update",
        "analytics:run",
        "report:read",
        "report:create",
        "copilot:query",
        "copilot:analyze"
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
        "audit:*",
        "report:read",
        "report:export",
        "policy:read",
        "sensitive:read",
        "dlp:override"
    ],
    "service-account": [
        "api:call",
        "data:read",
        "data:write"
    ],
    "agent": [
        "agent:execute",
        "tool:invoke",
        "data:read"
    ]
}

# ============================================================================
# Clearance Level Enforcement
# ============================================================================

clearance_levels := {
    "unclassified": 0,
    "cui": 1,
    "confidential": 2,
    "secret": 3,
    "top-secret": 4,
    "top-secret-sci": 5
}

clearance_sufficient if {
    # No classification on resource
    not input.resource.classification
}

clearance_sufficient if {
    # Unclassified always accessible
    input.resource.classification == "unclassified"
}

clearance_sufficient if {
    # Subject clearance >= resource classification
    subject_level := clearance_levels[input.subject.clearance]
    resource_level := clearance_levels[input.resource.classification]
    subject_level >= resource_level
}

clearance_insufficient if {
    input.resource.classification
    subject_level := clearance_levels[input.subject.clearance]
    resource_level := clearance_levels[input.resource.classification]
    subject_level < resource_level
}

# ============================================================================
# Step-Up Authentication Requirements
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

requires_stepup if {
    input.subject.risk_score > 0.5
}

stepup_verified if {
    input.subject.stepup_verified == true
    input.subject.stepup_timestamp
    time.now_ns() - input.subject.stepup_timestamp < stepup_ttl_ns
}

sensitive_action if {
    input.action in [
        "delete",
        "bulk_delete",
        "export",
        "bulk_export",
        "admin_action",
        "user_management",
        "config_change",
        "secret_access",
        "key_rotation"
    ]
}

sensitive_classification if {
    input.resource.classification in ["secret", "top-secret", "top-secret-sci"]
}

privileged_operation if {
    input.action in [
        "role_assign",
        "role_revoke",
        "tenant_manage",
        "policy_modify",
        "audit_export"
    ]
}

stepup_ttl_ns := 300 * 1000000000  # 5 minutes

# ============================================================================
# Environment Restrictions
# ============================================================================

environment_denied if {
    some env in input.environment.denied_environments
    startswith(input.action, env)
}

environment_denied if {
    input.environment.maintenance_mode == true
    not "global-admin" in input.subject.roles
}

# Business hours enforcement
environment_denied if {
    input.tenant.enforce_business_hours == true
    outside_business_hours
    sensitive_classification
    not "global-admin" in input.subject.roles
}

outside_business_hours if {
    hour := time.hour(time.now_ns())
    hour < 6
}

outside_business_hours if {
    hour := time.hour(time.now_ns())
    hour >= 22
}

# ============================================================================
# Rate Limiting
# ============================================================================

rate_limit_exceeded if {
    is_viewer
    input.subject.hourly_request_count > 100
}

rate_limit_exceeded if {
    is_analyst
    input.subject.hourly_request_count > 500
}

rate_limit_exceeded if {
    is_service_account
    input.subject.hourly_request_count > input.tenant.quotas.api_calls_per_hour
}

rate_limit_exceeded if {
    not "global-admin" in input.subject.roles
    input.subject.hourly_request_count > 10000
}

is_viewer if {
    "viewer" in input.subject.roles
}

is_analyst if {
    "analyst" in input.subject.roles
}

is_service_account if {
    input.subject.type == "service"
}

# ============================================================================
# Resource Owner Checks
# ============================================================================

is_resource_owner if {
    input.resource.owner == input.subject.id
}

# Owner can always read their own resources
allow if {
    is_resource_owner
    input.action == "read"
    not deny
}

# ============================================================================
# Decision Output
# ============================================================================

decision := {
    "allow": allow,
    "deny": deny,
    "reason": reason,
    "obligations": obligations,
    "stepup_required": requires_stepup,
    "audit_required": audit_required
}

reason := "Access granted" if {
    allow
}

reason := msg if {
    deny
    tenant_isolation_violated
    msg := "Tenant isolation violation"
}

reason := msg if {
    deny
    clearance_insufficient
    msg := "Insufficient clearance level"
}

reason := msg if {
    deny
    rate_limit_exceeded
    msg := "Rate limit exceeded"
}

reason := msg if {
    not allow
    not deny
    requires_stepup
    not stepup_verified
    msg := "Step-up authentication required"
}

reason := msg if {
    not allow
    not deny
    not role_permits_action
    msg := "Insufficient permissions"
}

# Obligations attached to allow decisions
obligations := obs if {
    allow
    obs := array.concat(audit_obligations, encryption_obligations)
}

audit_obligations := [{"type": "audit", "level": "mandatory"}] if {
    audit_required
}

audit_obligations := [] if {
    not audit_required
}

encryption_obligations := [{"type": "encrypt", "algorithm": "AES-256-GCM"}] if {
    sensitive_classification
    input.action in ["export", "read"]
}

encryption_obligations := [] if {
    not sensitive_classification
}

# Audit requirements
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
    input.resource.type == "audit"
}

# ============================================================================
# Policy Metadata
# ============================================================================

policy_metadata := {
    "version": "1.0.0",
    "name": "companyos-abac",
    "description": "Attribute-Based Access Control for CompanyOS",
    "last_updated": "2025-01-01T00:00:00Z"
}
