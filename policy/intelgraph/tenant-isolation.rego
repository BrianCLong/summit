# Tenant Isolation Policy for IntelGraph
# Enforces strict multi-tenant data scoping. Deny-by-default.

package intelgraph.tenant

import future.keywords.contains
import future.keywords.if
import future.keywords.in

default allow := false

# ── Allow rules ──────────────────────────────────────────────

# Allow if user tenant matches resource tenant
allow if {
	input.user.tenantId != ""
	input.resource.tenantId != ""
	input.user.tenantId == input.resource.tenantId
}

# Super-admins may operate cross-tenant when explicitly flagged
allow if {
	"super_admin" in input.user.roles
	input.user.crossTenantApproved == true
}

# System-internal service accounts (tenant = "__system__") bypass isolation
allow if {
	input.user.tenantId == "__system__"
	input.user.serviceAccount == true
}

# ── Deny rules (informational reasons) ──────────────────────

deny contains "tenant_mismatch" if {
	input.user.tenantId != input.resource.tenantId
	not "super_admin" in input.user.roles
	input.user.tenantId != "__system__"
}

deny contains "missing_user_tenant" if {
	not input.user.tenantId
}

deny contains "missing_user_tenant" if {
	input.user.tenantId == ""
}

deny contains "missing_resource_tenant" if {
	not input.resource.tenantId
}

deny contains "missing_resource_tenant" if {
	input.resource.tenantId == ""
}

deny contains "cross_tenant_not_approved" if {
	"super_admin" in input.user.roles
	input.user.tenantId != input.resource.tenantId
	not input.user.crossTenantApproved
}

# ── Decision bundle ──────────────────────────────────────────

decision := {
	"allow": allow,
	"deny": deny,
}
