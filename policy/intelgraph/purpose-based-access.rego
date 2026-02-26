# Purpose-Based Access Control for IntelGraph
# Restricts data access to authorized investigation purposes. Deny-by-default.

package intelgraph.purpose

import future.keywords.contains
import future.keywords.if
import future.keywords.in

default allow := false

# ── Allow rules ──────────────────────────────────────────────

# Allow if resource purpose is in user's active purposes
allow if {
	input.resource.purpose != ""
	input.resource.purpose in input.user.activePurposes
}

# Allow if user has wildcard purpose access (platform admin)
allow if {
	"purpose:*" in input.user.permissions
}

# Allow if resource has no purpose tag (unclassified data)
allow if {
	not input.resource.purpose
}

allow if {
	input.resource.purpose == ""
}

# ── Purpose hierarchy ────────────────────────────────────────

# Parent purposes implicitly grant access to child purposes
purpose_hierarchy := {
	"national-security": ["counter-terrorism", "counter-intelligence", "cyber-defense"],
	"law-enforcement": ["fraud-investigation", "organized-crime", "financial-crime"],
	"compliance": ["aml-kyc", "sanctions-screening", "regulatory-audit"],
}

# Allow if user has parent purpose that covers the resource purpose
allow if {
	some parent_purpose in input.user.activePurposes
	children := purpose_hierarchy[parent_purpose]
	input.resource.purpose in children
}

# ── Purpose expiry ───────────────────────────────────────────

# Check if a purpose assignment has expired
purpose_expired(purpose_id) if {
	some assignment in input.user.purposeAssignments
	assignment.purposeId == purpose_id
	assignment.expiresAt != ""
	assignment.expiresAt < input.currentTimestamp
}

# ── Deny rules ───────────────────────────────────────────────

deny contains "purpose_not_authorized" if {
	input.resource.purpose != ""
	not input.resource.purpose in input.user.activePurposes
	not "purpose:*" in input.user.permissions
	not purpose_via_hierarchy
}

deny contains "purpose_expired" if {
	input.resource.purpose != ""
	input.resource.purpose in input.user.activePurposes
	purpose_expired(input.resource.purpose)
}

deny contains "missing_active_purposes" if {
	not input.user.activePurposes
	not "purpose:*" in input.user.permissions
	input.resource.purpose != ""
}

# Helper: check hierarchy grant
purpose_via_hierarchy if {
	some parent_purpose in input.user.activePurposes
	children := purpose_hierarchy[parent_purpose]
	input.resource.purpose in children
}

# ── Decision bundle ──────────────────────────────────────────

decision := {
	"allow": allow,
	"deny": deny,
}
