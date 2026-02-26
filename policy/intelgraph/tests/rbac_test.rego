# Tests for rbac.rego

package intelgraph.rbac_test

import future.keywords.if
import future.keywords.in

import data.intelgraph.rbac

# ── Positive: role grants access ─────────────────────────────

test_allow_analyst_read_entity if {
	rbac.allow with input as {
		"user": {"roles": ["analyst"]},
		"resource": {"resourceType": "entity"},
		"operation": "READ",
	}
}

test_allow_analyst_write_investigation if {
	rbac.allow with input as {
		"user": {"roles": ["analyst"]},
		"resource": {"resourceType": "investigation"},
		"operation": "WRITE",
	}
}

test_allow_super_admin_delete_anything if {
	rbac.allow with input as {
		"user": {"roles": ["super_admin"]},
		"resource": {"resourceType": "config"},
		"operation": "DELETE",
	}
}

test_allow_viewer_read_case if {
	rbac.allow with input as {
		"user": {"roles": ["viewer"]},
		"resource": {"resourceType": "case"},
		"operation": "READ",
	}
}

test_allow_auditor_export_audit if {
	rbac.allow with input as {
		"user": {"roles": ["auditor"]},
		"resource": {"resourceType": "audit"},
		"operation": "EXPORT",
	}
}

test_allow_tenant_admin_delete_entity if {
	rbac.allow with input as {
		"user": {"roles": ["tenant_admin"]},
		"resource": {"resourceType": "entity"},
		"operation": "DELETE",
	}
}

# ── Negative: role denies access ─────────────────────────────

test_deny_viewer_write if {
	not rbac.allow with input as {
		"user": {"roles": ["viewer"]},
		"resource": {"resourceType": "entity"},
		"operation": "WRITE",
	}
}

test_deny_analyst_delete if {
	not rbac.allow with input as {
		"user": {"roles": ["analyst"]},
		"resource": {"resourceType": "entity"},
		"operation": "DELETE",
	}
}

test_deny_auditor_write if {
	not rbac.allow with input as {
		"user": {"roles": ["auditor"]},
		"resource": {"resourceType": "audit"},
		"operation": "WRITE",
	}
}

test_deny_viewer_access_config if {
	not rbac.allow with input as {
		"user": {"roles": ["viewer"]},
		"resource": {"resourceType": "config"},
		"operation": "READ",
	}
}

# ── Edge cases ───────────────────────────────────────────────

test_deny_no_roles if {
	not rbac.allow with input as {
		"user": {"roles": []},
		"resource": {"resourceType": "entity"},
		"operation": "READ",
	}
}

test_deny_unknown_role if {
	not rbac.allow with input as {
		"user": {"roles": ["hacker"]},
		"resource": {"resourceType": "entity"},
		"operation": "READ",
	}
}

test_deny_reason_no_roles if {
	"no_roles" in rbac.deny with input as {
		"user": {"roles": []},
		"resource": {"resourceType": "entity"},
		"operation": "READ",
	}
}

test_deny_reason_unknown_role if {
	"unknown_role" in rbac.deny with input as {
		"user": {"roles": ["hacker"]},
		"resource": {"resourceType": "entity"},
		"operation": "READ",
	}
}

# Multiple roles: highest privilege wins
test_allow_multi_role_escalation if {
	rbac.allow with input as {
		"user": {"roles": ["viewer", "analyst"]},
		"resource": {"resourceType": "entity"},
		"operation": "WRITE",
	}
}
