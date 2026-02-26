# Role-Based Access Control (Baseline) for IntelGraph
# Maps roles → permissions → operations. Deny-by-default.

package intelgraph.rbac

import future.keywords.contains
import future.keywords.if
import future.keywords.in

default allow := false

# ── Role definitions ─────────────────────────────────────────

role_permissions := {
	"super_admin": {
		"resources": {"*"},
		"operations": {"READ", "WRITE", "DELETE", "EXPORT"},
	},
	"tenant_admin": {
		"resources": {"entity", "relationship", "investigation", "case", "workflow", "export", "config"},
		"operations": {"READ", "WRITE", "DELETE", "EXPORT"},
	},
	"analyst": {
		"resources": {"entity", "relationship", "investigation", "case", "workflow"},
		"operations": {"READ", "WRITE"},
	},
	"viewer": {
		"resources": {"entity", "relationship", "investigation", "case"},
		"operations": {"READ"},
	},
	"auditor": {
		"resources": {"audit", "export", "policy", "governance"},
		"operations": {"READ", "EXPORT"},
	},
	"service_account": {
		"resources": {"entity", "relationship", "investigation"},
		"operations": {"READ", "WRITE"},
	},
}

# ── Allow rules ──────────────────────────────────────────────

allow if {
	some role in input.user.roles
	role_permissions[role]
	resource_allowed(role)
	operation_allowed(role)
}

resource_allowed(role) if {
	"*" in role_permissions[role].resources
}

resource_allowed(role) if {
	input.resource.resourceType in role_permissions[role].resources
}

operation_allowed(role) if {
	input.operation in role_permissions[role].operations
}

# ── Deny rules ───────────────────────────────────────────────

deny contains "no_roles" if {
	not input.user.roles
}

deny contains "no_roles" if {
	count(input.user.roles) == 0
}

deny contains "unknown_role" if {
	some role in input.user.roles
	not role_permissions[role]
}

deny contains "resource_not_permitted" if {
	not resource_permitted_by_any_role
}

deny contains "operation_not_permitted" if {
	not operation_permitted_by_any_role
}

# Helpers for deny diagnostics
resource_permitted_by_any_role if {
	some role in input.user.roles
	resource_allowed(role)
}

operation_permitted_by_any_role if {
	some role in input.user.roles
	operation_allowed(role)
}

# ── Decision bundle ──────────────────────────────────────────

decision := {
	"allow": allow,
	"deny": deny,
}
