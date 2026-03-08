# CompanyOS Tenant API Authorization Policy
# Provides authorization for tenant CRUD operations via the tenant-api service
#
# This policy is evaluated by the tenant-api middleware when OPA_ENABLED=true
# Path: /v1/data/companyos/authz/tenant/decision

package companyos.authz.tenant

import rego.v1

default decision := {"allow": false, "reason": "No matching policy rule"}

# ============================================================================
# MAIN DECISION
# ============================================================================

decision := result if {
    allow
    result := {
        "allow": true,
        "reason": allow_reason,
        "obligations": obligations,
    }
}

decision := result if {
    not allow
    result := {
        "allow": false,
        "reason": deny_reason,
        "obligations": [],
    }
}

# ============================================================================
# ALLOW RULES
# ============================================================================

# Platform admins can do anything
allow if {
    is_platform_admin
}

# Tenant admins can manage their own tenant
allow if {
    is_tenant_admin
    tenant_scope_valid
    allowed_tenant_admin_action
}

# Tenant viewers can read their own tenant
allow if {
    is_tenant_viewer
    tenant_scope_valid
    input.action == "tenant:read"
}

# Any authenticated user can list tenants they have access to
allow if {
    input.action == "tenant:list"
    authenticated
}

# ============================================================================
# ROLE CHECKS
# ============================================================================

is_platform_admin if {
    some role in input.subject.roles
    role == "platform-admin"
}

is_tenant_admin if {
    some role in input.subject.roles
    role == "tenant-admin"
}

is_tenant_viewer if {
    some role in input.subject.roles
    role == "tenant-viewer"
}

authenticated if {
    input.subject.id
    input.subject.id != ""
}

# ============================================================================
# ACTION PERMISSIONS
# ============================================================================

tenant_admin_actions := {
    "tenant:read",
    "tenant:update",
    "tenant:view_audit",
}

platform_admin_actions := {
    "tenant:create",
    "tenant:read",
    "tenant:update",
    "tenant:delete",
    "tenant:list",
    "tenant:manage_features",
    "tenant:view_audit",
}

allowed_tenant_admin_action if {
    input.action in tenant_admin_actions
}

# ============================================================================
# TENANT SCOPE VALIDATION
# ============================================================================

# Platform admins can access any tenant
tenant_scope_valid if {
    is_platform_admin
}

# Same tenant access
tenant_scope_valid if {
    input.subject.tenant_id == input.resource.tenant_id
}

# No tenant specified (list operations)
tenant_scope_valid if {
    not input.resource.tenant_id
}

# Cross-tenant access with explicit permission
tenant_scope_valid if {
    input.subject.tenant_id != input.resource.tenant_id
    some perm in input.subject.permissions
    perm == "cross-tenant:access"
}

# ============================================================================
# OBLIGATIONS
# ============================================================================

obligations contains obligation if {
    input.action in {"tenant:update", "tenant:delete", "tenant:manage_features"}
    obligation := {
        "type": "audit",
        "parameters": {
            "level": "high",
            "retain_days": 90,
        },
    }
}

# ============================================================================
# ALLOW/DENY REASONS
# ============================================================================

allow_reason := "Platform admin access granted" if {
    is_platform_admin
}

allow_reason := "Tenant admin access granted" if {
    is_tenant_admin
    tenant_scope_valid
}

allow_reason := "Tenant viewer access granted" if {
    is_tenant_viewer
    tenant_scope_valid
}

allow_reason := "List access granted" if {
    input.action == "tenant:list"
}

deny_reason := "Authentication required" if {
    not authenticated
}

deny_reason := "Tenant scope violation: cannot access resources from other tenants" if {
    authenticated
    not tenant_scope_valid
}

deny_reason := "Insufficient permissions for this action" if {
    authenticated
    tenant_scope_valid
    not is_platform_admin
    not allowed_tenant_admin_action
}

deny_reason := "Tenant viewer cannot perform this action" if {
    is_tenant_viewer
    input.action != "tenant:read"
    input.action != "tenant:list"
}
