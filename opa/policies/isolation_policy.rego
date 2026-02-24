package summit.authz.isolation
import future.keywords.if
import future.keywords.contains

default allow := false

# Helper to extract tenant_id from input
input_tenant_id := input.tenant_id
user_tenant_id := input.user.tenant_id

# Allow access if the user's tenant matches the resource's tenant
allow if {
    input_tenant_id == user_tenant_id
}

# Allow if it's a system-level agent with appropriate permissions
allow if {
    input.user.role == "system_admin"
}

# Specific rules for data operations
# For now, we enforce that all storage/compute requests must have a tenant_id
allow_operation if {
    allow
    input.operation != ""
}

# Deny cross-tenant access explicitly for audit trails
deny contains msg if {
    input_tenant_id != user_tenant_id
    input.user.role != "system_admin"
    msg := sprintf("Cross-tenant access attempt: %s tried to access %s", [user_tenant_id, input_tenant_id])
}
