# Tests for tenant-isolation.rego

package intelgraph.tenant_test

import future.keywords.if
import future.keywords.in

import data.intelgraph.tenant

# ── Positive: same-tenant access ─────────────────────────────

test_allow_same_tenant if {
	tenant.allow with input as {
		"user": {"tenantId": "tenant-1", "roles": ["analyst"]},
		"resource": {"tenantId": "tenant-1"},
	}
}

test_allow_system_service_account if {
	tenant.allow with input as {
		"user": {"tenantId": "__system__", "serviceAccount": true, "roles": []},
		"resource": {"tenantId": "tenant-1"},
	}
}

test_allow_super_admin_cross_tenant if {
	tenant.allow with input as {
		"user": {"tenantId": "tenant-1", "roles": ["super_admin"], "crossTenantApproved": true},
		"resource": {"tenantId": "tenant-2"},
	}
}

# ── Negative: cross-tenant denied ────────────────────────────

test_deny_cross_tenant if {
	not tenant.allow with input as {
		"user": {"tenantId": "tenant-1", "roles": ["analyst"]},
		"resource": {"tenantId": "tenant-2"},
	}
}

test_deny_super_admin_without_approval if {
	not tenant.allow with input as {
		"user": {"tenantId": "tenant-1", "roles": ["super_admin"]},
		"resource": {"tenantId": "tenant-2"},
	}
}

# ── Edge cases ───────────────────────────────────────────────

test_deny_missing_user_tenant if {
	not tenant.allow with input as {
		"user": {"tenantId": "", "roles": ["analyst"]},
		"resource": {"tenantId": "tenant-1"},
	}
}

test_deny_missing_resource_tenant if {
	not tenant.allow with input as {
		"user": {"tenantId": "tenant-1", "roles": ["analyst"]},
		"resource": {"tenantId": ""},
	}
}

test_deny_reasons_tenant_mismatch if {
	"tenant_mismatch" in tenant.deny with input as {
		"user": {"tenantId": "tenant-1", "roles": ["analyst"]},
		"resource": {"tenantId": "tenant-2"},
	}
}

test_deny_reasons_cross_tenant_not_approved if {
	"cross_tenant_not_approved" in tenant.deny with input as {
		"user": {"tenantId": "tenant-1", "roles": ["super_admin"]},
		"resource": {"tenantId": "tenant-2"},
	}
}

test_deny_reasons_missing_user_tenant if {
	"missing_user_tenant" in tenant.deny with input as {
		"user": {"tenantId": "", "roles": ["analyst"]},
		"resource": {"tenantId": "tenant-1"},
	}
}
