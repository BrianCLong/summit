# Tests for retention.rego

package intelgraph.retention_test

import future.keywords.if
import future.keywords.in

import data.intelgraph.retention

# ── Purge decisions ──────────────────────────────────────────

test_should_purge_expired_ephemeral if {
	# 8 days old (> 7 day ephemeral retention)
	retention.should_purge with input as {
		"data": {
			"retentionTier": "ephemeral",
			"createdAtNs": 1000000000000000000,
		},
		"currentTimestamp": 1000691200000000000,
	}
}

test_should_not_purge_fresh_ephemeral if {
	not retention.should_purge with input as {
		# 1 day old (< 7 day ephemeral retention)
		"data": {
			"retentionTier": "ephemeral",
			"createdAtNs": 1000000000000000000,
		},
		"currentTimestamp": 1000086400000000000,
	}
}

test_should_not_purge_legal_hold if {
	not retention.should_purge with input as {
		"data": {
			"retentionTier": "legal-hold",
			"createdAtNs": 1000000000000000000,
		},
		"currentTimestamp": 9999999999999999999,
	}
}

test_legal_hold_active if {
	retention.legal_hold_active with input as {
		"data": {"retentionTier": "legal-hold"},
	}
}

test_should_purge_expired_standard if {
	# 366 days old (> 365 day standard retention)
	retention.should_purge with input as {
		"data": {
			"retentionTier": "standard",
			"createdAtNs": 1000000000000000000,
		},
		"currentTimestamp": 1031622400000000000,
	}
}

# ── Tier transitions ────────────────────────────────────────

test_allow_tier_upgrade if {
	retention.allow_tier_change with input as {
		"data": {"retentionTier": "ephemeral"},
		"newTier": "standard",
		"user": {"permissions": []},
	}
}

test_deny_tier_downgrade_without_admin if {
	not retention.allow_tier_change with input as {
		"data": {"retentionTier": "standard"},
		"newTier": "ephemeral",
		"user": {"permissions": []},
	}
}

test_allow_tier_downgrade_with_admin if {
	retention.allow_tier_change with input as {
		"data": {"retentionTier": "standard"},
		"newTier": "ephemeral",
		"user": {"permissions": ["retention:admin"]},
	}
}

test_allow_same_tier if {
	retention.allow_tier_change with input as {
		"data": {"retentionTier": "standard"},
		"newTier": "standard",
		"user": {"permissions": []},
	}
}

test_allow_legal_hold_set if {
	retention.allow_tier_change with input as {
		"data": {"retentionTier": "standard"},
		"newTier": "legal-hold",
		"user": {"permissions": ["legal:hold"]},
	}
}

test_allow_legal_hold_release if {
	retention.allow_tier_change with input as {
		"data": {"retentionTier": "legal-hold"},
		"newTier": "standard",
		"user": {"permissions": ["legal:release"]},
	}
}

test_deny_legal_hold_release_without_permission if {
	not retention.allow_tier_change with input as {
		"data": {"retentionTier": "legal-hold"},
		"newTier": "standard",
		"user": {"permissions": []},
	}
}

# ── Validation ───────────────────────────────────────────────

test_deny_invalid_tier if {
	"invalid_tier" in retention.deny with input as {
		"data": {"retentionTier": "bogus"},
	}
}

test_deny_missing_tier if {
	"missing_retention_tier" in retention.deny with input as {
		"data": {"retentionTier": ""},
	}
}

test_deny_legal_hold_purge if {
	"legal_hold_purge_blocked" in retention.deny with input as {
		"data": {"retentionTier": "legal-hold"},
		"operation": "purge",
	}
}
