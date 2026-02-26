# Data Retention Tier Policies for IntelGraph
# Enforces data lifecycle management with 5 retention tiers.

package intelgraph.retention

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# ── Retention tier definitions (days) ────────────────────────

retention_days := {
	"ephemeral": 7,
	"short": 30,
	"standard": 365,
	"long": 1825,
	"legal-hold": -1,
}

valid_tiers := {"ephemeral", "short", "standard", "long", "legal-hold"}

# ── Purge decisions ──────────────────────────────────────────

# Data should be purged when retention period exceeded
default should_purge := false

should_purge if {
	tier := input.data.retentionTier
	tier != "legal-hold"
	tier in valid_tiers
	days := retention_days[tier]
	age_ns := input.currentTimestamp - input.data.createdAtNs
	retention_ns := days * 86400 * 1000000000
	age_ns > retention_ns
}

# Legal hold always prevents purging
legal_hold_active if {
	input.data.retentionTier == "legal-hold"
}

# ── Tier transition rules ────────────────────────────────────

# Allow tier upgrade (longer retention) without restrictions
default allow_tier_change := false

allow_tier_change if {
	tier_order[input.newTier] > tier_order[input.data.retentionTier]
}

# Tier downgrade (shorter retention) requires admin permission
allow_tier_change if {
	tier_order[input.newTier] < tier_order[input.data.retentionTier]
	"retention:admin" in input.user.permissions
}

# Same tier is a no-op, always allowed
allow_tier_change if {
	input.newTier == input.data.retentionTier
}

# Legal-hold can only be set/released by legal role
allow_tier_change if {
	input.newTier == "legal-hold"
	"legal:hold" in input.user.permissions
}

allow_tier_change if {
	input.data.retentionTier == "legal-hold"
	input.newTier != "legal-hold"
	"legal:release" in input.user.permissions
}

tier_order := {
	"ephemeral": 1,
	"short": 2,
	"standard": 3,
	"long": 4,
	"legal-hold": 5,
}

# ── Validation ───────────────────────────────────────────────

deny contains "invalid_tier" if {
	not input.data.retentionTier in valid_tiers
}

deny contains "invalid_new_tier" if {
	input.newTier
	not input.newTier in valid_tiers
}

deny contains "missing_retention_tier" if {
	not input.data.retentionTier
}

deny contains "missing_retention_tier" if {
	input.data.retentionTier == ""
}

deny contains "legal_hold_purge_blocked" if {
	legal_hold_active
	input.operation == "purge"
}

deny contains "tier_downgrade_unauthorized" if {
	input.newTier
	tier_order[input.newTier] < tier_order[input.data.retentionTier]
	not "retention:admin" in input.user.permissions
}

deny contains "legal_hold_release_unauthorized" if {
	input.data.retentionTier == "legal-hold"
	input.newTier
	input.newTier != "legal-hold"
	not "legal:release" in input.user.permissions
}

# ── Decision bundle ──────────────────────────────────────────

decision := {
	"should_purge": should_purge,
	"legal_hold": legal_hold_active,
	"allow_tier_change": allow_tier_change,
	"deny": deny,
}
