# IntelGraph OPA Policies
# 
# This file defines access control policies for IntelGraph platform
# covering RBAC, tenant isolation, and field-level permissions.

package intelgraph

import future.keywords.if
import future.keywords.in

# Default deny - all operations must be explicitly allowed
default allow = false

# Allow decision with reason
allow = {
    "allow": true,
    "reason": reason
} if {
    reason := allowed_operations[_]
}

# Collect all allowed operations with reasons
allowed_operations := reasons if {
    reasons := [reason |
        some rule
        rule_allows[rule]
        reason := sprintf("Allowed by rule: %s", [rule])
    ]
    count(reasons) > 0
}

# Track which rules allow the operation
rule_allows := {
    "admin_full_access": admin_full_access,
    "analyst_read_access": analyst_read_access,
    "analyst_investigation_access": analyst_investigation_access,
    "user_own_profile": user_own_profile,
    "public_health_check": public_health_check,
    "tenant_isolation": tenant_isolation_check
}

#------------------------------------------------------------------------------
# ROLE-BASED ACCESS CONTROL (RBAC)
#------------------------------------------------------------------------------

# Administrators have full access
admin_full_access if {
    input.user.role == "admin"
}

# Analysts can read most resources
analyst_read_access if {
    input.user.role in ["analyst", "senior_analyst"]
    input.action in [
        "query.investigations",
        "query.investigation", 
        "query.entities",
        "query.relationships",
        "query.copilotRuns",
        "query.copilotRun",
        "query.copilotEvents"
    ]
}

# Analysts can manage their own investigations
analyst_investigation_access if {
    input.user.role in ["analyst", "senior_analyst"]
    input.action in [
        "mutation.createInvestigation",
        "mutation.updateInvestigation",
        "mutation.createEntity",
        "mutation.createRelationship",
        "mutation.startCopilotRun",
        "mutation.pauseCopilotRun"
    ]
    # Additional checks for investigation ownership would go here
}

# Users can access their own profile
user_own_profile if {
    input.action in ["query.user", "mutation.updateUser"]
    input.resource.args.id == input.user.id
}

# Public health check access
public_health_check if {
    input.action in ["query.__typename", "query.health"]
}

#------------------------------------------------------------------------------
# TENANT ISOLATION
#------------------------------------------------------------------------------

# Tenant isolation check - users can only access their tenant's data
tenant_isolation_check if {
    # If no tenant context, allow (for system operations)
    not input.context.tenantId
} else = result if {
    # If tenant context exists, it must match user's tenant
    input.context.tenantId == input.user.tenantId
    result := true
}

#------------------------------------------------------------------------------
# INVESTIGATION-SPECIFIC PERMISSIONS
#------------------------------------------------------------------------------

# Check if user has access to specific investigation
investigation_access if {
    # For now, allow if tenant matches
    # In future, add investigation-level permissions
    input.context.investigationId
    tenant_isolation_check
}

#------------------------------------------------------------------------------
# RESOURCE-SPECIFIC RULES
#------------------------------------------------------------------------------

# Entity operations
entity_operations if {
    input.resource.type == "Entity"
    input.user.role in ["analyst", "senior_analyst", "admin"]
    tenant_isolation_check
}

# Relationship operations  
relationship_operations if {
    input.resource.type == "Relationship"
    input.user.role in ["analyst", "senior_analyst", "admin"]
    tenant_isolation_check
}

# Copilot operations
copilot_operations if {
    input.resource.type in ["CopilotRun", "CopilotTask", "CopilotEvent"]
    input.user.role in ["analyst", "senior_analyst", "admin"]
    tenant_isolation_check
}

# Import operations
import_operations if {
    input.action in [
        "mutation.startCSVImport",
        "mutation.startSTIXImport", 
        "query.importJobs"
    ]
    input.user.role in ["analyst", "senior_analyst", "admin"]
    tenant_isolation_check
}

#------------------------------------------------------------------------------
# FIELD-LEVEL PERMISSIONS
#------------------------------------------------------------------------------

# Sensitive fields that require elevated permissions
sensitive_fields := {
    "user.email",
    "user.role", 
    "investigation.metadata",
    "entity.internalId",
    "relationship.internalId"
}

# Check if accessing sensitive field
accessing_sensitive_field if {
    field_path := sprintf("%s.%s", [input.resource.type, input.resource.field])
    field_path in sensitive_fields
}

# Allow sensitive field access for admins or own data
sensitive_field_access if {
    accessing_sensitive_field
    input.user.role == "admin"
} else if {
    accessing_sensitive_field
    input.resource.type == "User"
    input.resource.args.id == input.user.id
}

#------------------------------------------------------------------------------
# TIME-BASED RESTRICTIONS
#------------------------------------------------------------------------------

# Business hours check (optional)
business_hours if {
    # Convert to hours (simplified - would need proper timezone handling)
    now := time.now_ns() / 1000000000
    hour := (now / 3600) % 24
    hour >= 8
    hour <= 18
}

# Allow operations outside business hours only for certain roles
after_hours_access if {
    not business_hours
    input.user.role in ["admin", "senior_analyst"]
}

#------------------------------------------------------------------------------
# AUDIT AND COMPLIANCE
#------------------------------------------------------------------------------

# Track high-risk operations for audit
high_risk_operation if {
    input.action in [
        "mutation.deleteInvestigation",
        "mutation.deleteEntity",
        "mutation.deleteRelationship",
        "mutation.updateUserRole"
    ]
}

# Require approval for high-risk operations (future)
requires_approval if {
    high_risk_operation
    not input.context.approved
    input.user.role != "admin"
}

#------------------------------------------------------------------------------
# DEVELOPMENT AND TESTING
#------------------------------------------------------------------------------

# Allow broader access in development environment
dev_environment if {
    input.context.environment == "development"
}

# Test user access
test_user_access if {
    input.user.email
    endswith(input.user.email, "@test.intelgraph.com")
    dev_environment
}

#------------------------------------------------------------------------------
# HELPER FUNCTIONS
#------------------------------------------------------------------------------

# Check if user has specific permission
has_permission(permission) if {
    permission in input.user.permissions
}

# Check if user is in specific role
is_role(role) if {
    input.user.role == role
}

# Check if accessing own data
is_own_data if {
    input.resource.args.userId == input.user.id
}

#------------------------------------------------------------------------------
# EMERGENCY ACCESS
#------------------------------------------------------------------------------

# Emergency access (break-glass) - requires special token
emergency_access if {
    input.context.emergency_token
    # In real implementation, validate emergency token
    input.user.role in ["admin", "senior_analyst"]
}

#------------------------------------------------------------------------------
# POLICY COMPOSITION
#------------------------------------------------------------------------------

# Compose all allow conditions
allow if {
    admin_full_access
} else if {
    analyst_read_access
    tenant_isolation_check
} else if {
    analyst_investigation_access  
    tenant_isolation_check
} else if {
    user_own_profile
} else if {
    public_health_check
} else if {
    entity_operations
} else if {
    relationship_operations
} else if {
    copilot_operations
} else if {
    import_operations
} else if {
    sensitive_field_access
} else if {
    test_user_access
} else if {
    emergency_access
}

# Explicit deny conditions (takes precedence)
deny = {
    "allow": false,
    "reason": reason
} if {
    reason := denied_reasons[_]
}

denied_reasons := [reason |
    some check
    deny_checks[check]
    reason := sprintf("Denied by check: %s", [check])
]

deny_checks := {
    "requires_approval": requires_approval,
    "tenant_isolation_failed": not tenant_isolation_check,
    "no_valid_role": not input.user.role
}

# Final decision (deny takes precedence over allow)
decision := deny if {
    deny.allow == false
} else := allow