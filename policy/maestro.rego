package maestro.authz

import future.keywords.if
import future.keywords.contains

default allow = false

# --- Roles ---
# conductor_admin: Full access to all tenants
# workflow_author: Can create/edit definitions in their tenant
# run_operator: Can start/stop runs in their tenant
# approver: Can approve/reject steps in their tenant
# auditor: Read-only access to all data in their tenant

# --- Input Structure ---
# input.user: { id, tenantId, roles: [] }
# input.action: string (create_workflow, start_run, approve_step, view_run)
# input.resource: { tenantId, costCenter, riskLevel, ... }

# --- General Access Rules ---

# Admin override
allow if {
  "conductor_admin" in input.user.roles
}

# Tenant isolation check
tenant_match if {
  input.user.tenantId == input.resource.tenantId
}

# Workflow Creation
allow if {
  input.action == "create_workflow"
  tenant_match
  "workflow_author" in input.user.roles
}

# Start Run
allow if {
  input.action == "start_run"
  tenant_match
  "run_operator" in input.user.roles
}

# Approve Step
allow if {
  input.action == "approve_step"
  tenant_match
  "approver" in input.user.roles
  # Check if user has the specific required role for this approval if specified
  has_required_approval_role
}

has_required_approval_role if {
  not input.resource.requiredRole
}

has_required_approval_role if {
  input.resource.requiredRole
  input.resource.requiredRole in input.user.roles
}

# View Run / Events
allow if {
  input.action == "view_run"
  tenant_match
  user_has_read_access
}

user_has_read_access if { "workflow_author" in input.user.roles }
user_has_read_access if { "run_operator" in input.user.roles }
user_has_read_access if { "approver" in input.user.roles }
user_has_read_access if { "auditor" in input.user.roles }

# --- Deny Reasons ---

deny contains "Tenant mismatch" if {
  input.resource.tenantId
  not tenant_match
  not "conductor_admin" in input.user.roles
}

deny contains "Missing required role" if {
  not allow
  tenant_match
}
