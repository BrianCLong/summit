# Safe Analytics Workbench - Workspace Policies
#
# OPA Rego policies for workspace access control and governance.

package analytics.workspace

import future.keywords.in
import future.keywords.if
import future.keywords.contains

# ============================================================================
# Default Deny
# ============================================================================

default allow := false

# ============================================================================
# Workspace Creation Policies
# ============================================================================

# Allow workspace creation if user has appropriate role and quota
allow if {
    input.action == "CREATE_WORKSPACE"
    valid_workspace_type
    within_quota
    valid_justification
}

# Validate workspace type for user role
valid_workspace_type if {
    input.workspace.type == "AD_HOC"
    input.user.roles[_] == "analyst"
}

valid_workspace_type if {
    input.workspace.type == "AD_HOC"
    input.user.roles[_] == "data_scientist"
}

valid_workspace_type if {
    input.workspace.type == "RECURRING_REPORT"
    input.user.roles[_] in ["analyst", "data_scientist", "engineer"]
}

valid_workspace_type if {
    input.workspace.type == "MODEL_DEVELOPMENT"
    input.user.roles[_] in ["data_scientist", "engineer"]
}

valid_workspace_type if {
    input.workspace.type == "AUDIT_INVESTIGATION"
    input.user.roles[_] in ["auditor", "compliance", "engineer"]
}

valid_workspace_type if {
    input.workspace.type == "SHARED_ANALYSIS"
    input.user.roles[_] in ["data_scientist", "engineer"]
}

# Check user workspace quota
within_quota if {
    count(input.user.active_workspaces) < max_workspaces[input.user.roles[0]]
}

max_workspaces := {
    "analyst": 3,
    "data_scientist": 5,
    "engineer": 10,
    "auditor": 2,
}

# Require justification for non-adhoc workspaces
valid_justification if {
    input.workspace.type == "AD_HOC"
}

valid_justification if {
    input.workspace.type != "AD_HOC"
    count(input.workspace.justification) >= 20
}

# ============================================================================
# Workspace Access Policies
# ============================================================================

# Owner can always access their workspace
allow if {
    input.action == "ACCESS_WORKSPACE"
    input.workspace.owner_id == input.user.id
}

# Collaborators can access with appropriate permissions
allow if {
    input.action == "ACCESS_WORKSPACE"
    collaborator := input.workspace.collaborators[_]
    collaborator.user_id == input.user.id
    "VIEW" in collaborator.permissions
}

# Engineers have admin access to all workspaces in their tenant
allow if {
    input.action == "ACCESS_WORKSPACE"
    input.user.roles[_] == "engineer"
    input.workspace.tenant_id == input.user.tenant_id
}

# Auditors can view any workspace in their tenant (read-only)
allow if {
    input.action == "ACCESS_WORKSPACE"
    input.user.roles[_] == "auditor"
    input.workspace.tenant_id == input.user.tenant_id
}

# ============================================================================
# Workspace Update Policies
# ============================================================================

allow if {
    input.action == "UPDATE_WORKSPACE"
    input.workspace.owner_id == input.user.id
}

allow if {
    input.action == "UPDATE_WORKSPACE"
    collaborator := input.workspace.collaborators[_]
    collaborator.user_id == input.user.id
    "ADMIN" in collaborator.permissions
}

allow if {
    input.action == "UPDATE_WORKSPACE"
    input.user.roles[_] == "engineer"
    input.workspace.tenant_id == input.user.tenant_id
}

# ============================================================================
# Workspace Delete Policies
# ============================================================================

# Only owners and engineers can delete workspaces
allow if {
    input.action == "DELETE_WORKSPACE"
    input.workspace.owner_id == input.user.id
}

allow if {
    input.action == "DELETE_WORKSPACE"
    input.user.roles[_] == "engineer"
    input.workspace.tenant_id == input.user.tenant_id
}

# ============================================================================
# Resource Override Policies
# ============================================================================

# Resource overrides require approval for analysts
resource_override_allowed if {
    input.action == "RESOURCE_OVERRIDE"
    input.user.roles[_] in ["data_scientist", "engineer"]
}

resource_override_allowed if {
    input.action == "RESOURCE_OVERRIDE"
    input.user.roles[_] == "analyst"
    input.override.vcpu <= 2
    input.override.memory_gb <= 8
    input.override.storage_gb <= 20
}

# ============================================================================
# Helper Rules
# ============================================================================

# Check if workspace is active
workspace_active if {
    input.workspace.status == "ACTIVE"
}

# Check if workspace is accessible (not deleted)
workspace_accessible if {
    input.workspace.status in ["ACTIVE", "IDLE", "SUSPENDED", "ARCHIVED"]
}

# Check if user is in same tenant
same_tenant if {
    input.workspace.tenant_id == input.user.tenant_id
}

# ============================================================================
# Denial Reasons
# ============================================================================

deny_reasons contains "Workspace type not allowed for your role" if {
    input.action == "CREATE_WORKSPACE"
    not valid_workspace_type
}

deny_reasons contains "Workspace quota exceeded" if {
    input.action == "CREATE_WORKSPACE"
    not within_quota
}

deny_reasons contains "Justification required (minimum 20 characters)" if {
    input.action == "CREATE_WORKSPACE"
    not valid_justification
}

deny_reasons contains "Access denied - not owner or collaborator" if {
    input.action == "ACCESS_WORKSPACE"
    not allow
}

deny_reasons contains "Cannot modify workspace - insufficient permissions" if {
    input.action == "UPDATE_WORKSPACE"
    not allow
}

deny_reasons contains "Cannot delete workspace - insufficient permissions" if {
    input.action == "DELETE_WORKSPACE"
    not allow
}
