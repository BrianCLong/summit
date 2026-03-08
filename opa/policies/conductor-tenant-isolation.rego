# Conductor Tenant Isolation Policy
# Enforces strict tenant boundaries and data access controls

package conductor.tenant_isolation

import rego.v1

# Default deny
default allow := false

# Allow access if tenant isolation rules are satisfied
allow if {
    tenant_boundary_check
    data_classification_check
    cross_tenant_validation
}

# Check tenant boundary isolation
tenant_boundary_check if {
    # User's tenant matches resource tenant
    input.tenantId == resource_tenant_id
}

tenant_boundary_check if {
    # System actions are allowed with proper context
    input.action == "system"
    input.role == "system"
}

tenant_boundary_check if {
    # Super admin can cross tenant boundaries with audit logging
    input.role == "super_admin"
    audit_log := {
        "level": "warn",
        "message": "Super admin cross-tenant access",
        "metadata": {
            "admin_user": input.userId,
            "target_tenant": resource_tenant_id,
            "action": input.action,
            "resource": input.resource
        }
    }
}

# Data classification check
data_classification_check if {
    # Public data is accessible to all tenants
    data.tenant_configs[input.tenantId].dataClassification == "public"
}

data_classification_check if {
    # Internal data requires same tenant or explicit sharing
    data.tenant_configs[input.tenantId].dataClassification == "internal"
    input.tenantId == resource_tenant_id
}

data_classification_check if {
    # Confidential data requires strict tenant boundary
    data.tenant_configs[input.tenantId].dataClassification in ["confidential", "restricted"]
    input.tenantId == resource_tenant_id
    not cross_tenant_request
}

# Cross-tenant validation
cross_tenant_validation if {
    not cross_tenant_request
}

cross_tenant_validation if {
    cross_tenant_request
    input.action in data.tenant_configs[input.tenantId].allowedCrossTenantActions
    audit_required
}

# Helper rules
cross_tenant_request if {
    input.targetTenantId
    input.tenantId != input.targetTenantId
}

resource_tenant_id := data.resource_metadata[input.resource].tenantId

audit_required if {
    data.tenant_configs[input.tenantId].auditRequirements.logAllActions == true
}

# Conditions for allowed access
conditions contains "audit_required" if audit_required

conditions contains "rate_limited" if {
    input.role == "user"
    not input.businessContext.project
}

conditions contains "monitoring_required" if {
    data.tenant_configs[input.tenantId].isolationLevel == "strict"
}

# Tags for resource labeling
tags contains sprintf("tenant:%s", [input.tenantId])

tags contains sprintf("classification:%s", [data.tenant_configs[input.tenantId].dataClassification])

tags contains sprintf("isolation_level:%s", [data.tenant_configs[input.tenantId].isolationLevel])

# Data filters for query results
data_filters := {
    "tenant_scope": [input.tenantId],
    "field_mask": field_mask_for_role,
    "row_level_filters": {
        "tenantId": input.tenantId
    }
} if {
    allow
}

field_mask_for_role := [] if input.role == "admin"

field_mask_for_role := ["internalNotes", "systemMetadata"] if input.role == "user"

field_mask_for_role := ["internalNotes", "systemMetadata", "auditTrail"] if input.role == "viewer"

# Audit logging configuration
audit_log := {
    "level": "info",
    "message": "Tenant isolation policy evaluation",
    "metadata": {
        "tenant": input.tenantId,
        "user": input.userId,
        "action": input.action,
        "resource": input.resource,
        "decision": allow,
        "conditions": conditions
    }
} if {
    data.tenant_configs[input.tenantId].auditRequirements.logDataAccess == true
}

# Reason for policy decision
reason := "Access granted within tenant boundary" if {
    allow
    input.tenantId == resource_tenant_id
}

reason := "Access granted with cross-tenant authorization" if {
    allow
    cross_tenant_request
}

reason := "Access denied: tenant boundary violation" if {
    not allow
    input.tenantId != resource_tenant_id
    not cross_tenant_authorized
}

reason := "Access denied: insufficient role permissions" if {
    not allow
    input.role not in ["admin", "super_admin", "system"]
    restricted_action
}

reason := "Access denied: data classification restriction" if {
    not allow
    data.tenant_configs[input.tenantId].dataClassification in ["confidential", "restricted"]
    cross_tenant_request
}

# Helper rules for complex logic
cross_tenant_authorized if {
    input.action in data.tenant_configs[input.tenantId].allowedCrossTenantActions
    input.role in ["admin", "super_admin"]
}

restricted_action if {
    input.action in ["delete", "admin", "system"]
}

# Emergency override (requires special token)
emergency_override if {
    input.sessionContext.emergencyToken
    verify_emergency_token(input.sessionContext.emergencyToken)
    input.role == "super_admin"
}

allow if emergency_override