import future.keywords.in
import future.keywords.if
# Baseline ABAC Rego Policies for IntelGraph Summit
# Implements foundational attribute-based access control for core platform operations

package baseline_abac

import rego.v1

# Default deny - explicit allow required for all operations
default allow := false

# Core system resources that require authorization
protected_resources := {
    "user",
    "tenant", 
    "investigation", 
    "entity", 
    "relationship", 
    "case",
    "workflow",
    "export",
    "audit",
    "config",
    "policy",
    "governance",
    "maestro",
    "orchestration"
}

# Core actions that require authorization
protected_actions := {
    "read", 
    "write", 
    "create", 
    "update", 
    "delete", 
    "execute", 
    "administer",
    "export",
    "import",
    "configure"
}

# Define user roles with associated privileges
role_privileges := {
    "super_admin": {
        "resources": {"*"},
        "actions": {"*"},
        "tenants": {"*"}
    },
    "tenant_admin": {
        "resources": {"*"},
        "actions": {"*"},
        "tenants": {"current"}  # Same tenant as user
    },
    "analyst": {
        "resources": {"investigation", "entity", "relationship", "case", "workflow"},
        "actions": {"read", "create", "update"},
        "tenants": {"current"}
    },
    "viewer": {
        "resources": {"investigation", "entity", "relationship", "case", "workflow"},
        "actions": {"read"},
        "tenants": {"current"}
    },
    "auditor": {
        "resources": {"audit", "export", "policy"},
        "actions": {"read"},
        "tenants": {"current", "cross"}
    }
}

# Main authorization rule
allow if {
    # Validate input structure
    valid_input
    
    # Check if resource is protected
    input.resource.type in protected_resources
    
    # Check if action is protected
    input.action in protected_actions
    
    # Validate user has a recognized role
    user_has_valid_role
    
    # Perform role-based authorization
    role_based_authorization
    
    # Enforce tenant isolation
    tenant_isolation_compliant
    
    # Apply additional constraints if needed
    additional_constraints_pass
}

# Validate input structure
valid_input if {
    input.user.id
    input.user.roles[_] != ""
    input.resource.type
    input.action
}

# Verify user has at least one recognized role
user_has_valid_role if {
    some role
    input.user.roles[role]
    role_privileges[role]
}

# Role-based authorization check
role_based_authorization if {
    some role
    input.user.roles[role]
    role_privileges[role].resources[_] == input.resource.type or role_privileges[role].resources[_] == "*"
    role_privileges[role].actions[_] == input.action or role_privileges[role].actions[_] == "*"
}

# Tenant isolation enforcement
tenant_isolation_compliant if {
    # Super admins can access any tenant
    user_has_role("super_admin")
}

tenant_isolation_compliant if {
    # Tenant admins and lower can only access their own tenant
    input.user.tenant_id == input.resource.tenant_id or input.resource.tenant_id == ""
}

tenant_isolation_compliant if {
    # Auditors may have cross-tenant access for compliance functions
    user_has_role("auditor") and 
    input.resource.type in {"audit", "export", "policy"}
}

# Check if user has a specific role
user_has_role(role) if {
    input.user.roles[_] == role
}

# Additional constraints beyond basic RBAC
additional_constraints_pass if {
    # All checks pass (default)
    not privileged_operation_requires_additional_verification
    not sensitive_data_requires_additional_authorization
    not rate_limit_exceeded
    not maintenance_mode_restrictions_apply
}

# Privileged operations require additional verification
privileged_operation_requires_additional_verification if {
    input.action in {"delete", "administer", "configure", "export"}
    input.resource.type in {"user", "tenant", "config", "policy", "governance", "maestro"}
    not input.user.multi_factor_authenticated
}

# Sensitive data access requires additional authorization
sensitive_data_requires_additional_authorization if {
    input.resource.tags[_] == "sensitive"
    input.resource.tags[_] == "pii"
    input.resource.tags[_] == "classified"
    not input.user.authorized_for_sensitive_data
}

# Rate limiting based on user role
rate_limit_exceeded if {
    # Super admin rate limits
    user_has_role("super_admin") and input.user.hourly_requests > 5000
}

rate_limit_exceeded if {
    # Tenant admin rate limits  
    user_has_role("tenant_admin") and input.user.hourly_requests > 2000
}

rate_limit_exceeded if {
    # Analyst rate limits
    user_has_role("analyst") and input.user.hourly_requests > 500
}

rate_limit_exceeded if {
    # Viewer rate limits
    user_has_role("viewer") and input.user.hourly_requests > 100
}

# Maintenance mode restrictions
maintenance_mode_restrictions_apply if {
    input.system.maintenance_mode
    not user_has_role("super_admin")
}

# Conditional access for specific resources
allow if {
    # Public resources are accessible to all authenticated users
    input.resource.visibility == "public"
    input.user.authenticated
}

allow if {
    # User can access their own profile
    input.resource.type == "user"
    input.action in {"read", "update"}
    input.resource.id == input.user.id
}

# Special handling for cross-tenant operations
allow if {
    user_has_role("super_admin")
    input.operation_type == "cross_tenant"
}

allow if {
    user_has_role("auditor")
    input.resource.type in {"audit", "export"}
    input.operation_type == "cross_tenant"
    input.business_justification
}

# Policy metadata
policy_info := {
    "version": "1.0",
    "name": "baseline_abac_policy",
    "description": "Baseline ABAC policy for IntelGraph Summit platform",
    "last_updated": "2026-01-31",
    "contact": "security@intelgraph.dev"
}

# Diagnostic information for debugging
diagnostics := diagnostic_info if {
    diagnostic_info := {
        "decision": allow,
        "user_id": input.user.id,
        "user_roles": input.user.roles,
        "resource_type": input.resource.type,
        "resource_tenant": input.resource.tenant_id,
        "action": input.action,
        "user_tenant": input.user.tenant_id,
        "is_super_admin": user_has_role("super_admin"),
        "is_tenant_admin": user_has_role("tenant_admin"),
        "is_valid_input": valid_input,
        "has_valid_role": user_has_valid_role,
        "rbac_approved": role_based_authorization,
        "tenant_isolation_passed": tenant_isolation_compliant,
        "additional_constraints_passed": additional_constraints_pass
    }
}