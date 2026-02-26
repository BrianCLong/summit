# Tests for purpose-based-access.rego

package intelgraph.purpose_test

import future.keywords.if
import future.keywords.in

import data.intelgraph.purpose

# ── Positive: authorized purpose ─────────────────────────────

test_allow_matching_purpose if {
	purpose.allow with input as {
		"user": {"activePurposes": ["investigation-123", "investigation-456"], "permissions": []},
		"resource": {"purpose": "investigation-123"},
	}
}

test_allow_wildcard_purpose if {
	purpose.allow with input as {
		"user": {"activePurposes": [], "permissions": ["purpose:*"]},
		"resource": {"purpose": "investigation-999"},
	}
}

test_allow_no_purpose_tag if {
	purpose.allow with input as {
		"user": {"activePurposes": ["investigation-123"], "permissions": []},
		"resource": {"purpose": ""},
	}
}

test_allow_missing_purpose_field if {
	purpose.allow with input as {
		"user": {"activePurposes": ["investigation-123"], "permissions": []},
		"resource": {},
	}
}

# ── Positive: purpose hierarchy ──────────────────────────────

test_allow_parent_purpose_grants_child if {
	purpose.allow with input as {
		"user": {"activePurposes": ["national-security"], "permissions": []},
		"resource": {"purpose": "counter-terrorism"},
	}
}

test_allow_law_enforcement_grants_fraud if {
	purpose.allow with input as {
		"user": {"activePurposes": ["law-enforcement"], "permissions": []},
		"resource": {"purpose": "fraud-investigation"},
	}
}

test_allow_compliance_grants_aml if {
	purpose.allow with input as {
		"user": {"activePurposes": ["compliance"], "permissions": []},
		"resource": {"purpose": "aml-kyc"},
	}
}

# ── Negative: unauthorized purpose ───────────────────────────

test_deny_wrong_purpose if {
	not purpose.allow with input as {
		"user": {"activePurposes": ["investigation-123"], "permissions": []},
		"resource": {"purpose": "investigation-999"},
	}
}

test_deny_no_active_purposes if {
	not purpose.allow with input as {
		"user": {"activePurposes": [], "permissions": []},
		"resource": {"purpose": "investigation-123"},
	}
}

# ── Deny reason checks ──────────────────────────────────────

test_deny_reason_purpose_not_authorized if {
	"purpose_not_authorized" in purpose.deny with input as {
		"user": {"activePurposes": ["investigation-123"], "permissions": []},
		"resource": {"purpose": "investigation-999"},
	}
}

# ── Edge: hierarchy does not grant unrelated child ───────────

test_deny_hierarchy_wrong_parent if {
	not purpose.allow with input as {
		"user": {"activePurposes": ["national-security"], "permissions": []},
		"resource": {"purpose": "fraud-investigation"},
	}
}
