package ci_agent_gate

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# CI Agent Gate Policy
# Enforces agent permission tiers and protects sensitive paths in CI.

# Deny if agent modifies protected paths without Tier-4
deny contains msg if {
    is_agent
    not is_tier_4
    file := input.changes[_].file
    is_protected_path(file)
    user_name := object.get(input.user, "name", "unknown")
    user_tier := object.get(input.user, "tier", "unknown")
    msg := sprintf("Agent %s (Tier %s) is not allowed to modify protected path: %s", [user_name, user_tier, file])
}

# Deny if agent is not explicitly authorized for the repo (e.g. unknown tier)
deny contains msg if {
    is_agent
    not known_tier
    user_name := object.get(input.user, "name", "unknown")
    user_tier := object.get(input.user, "tier", "unknown")
    msg := sprintf("Agent %s has unknown permission tier: %s", [user_name, user_tier])
}

# Helper: Check if user is an agent
is_agent if {
    input.user.type == "AGENT"
}

# Helper: Check if agent is Tier-4 (Critical)
is_tier_4 if {
    tier := object.get(input.user, "tier", "unknown")
    tier == "tier-4"
} else if {
    tier := object.get(input.user, "tier", "unknown")
    tier == "critical"
}

# Helper: Check if tier is known
known_tier if {
    tiers := {"tier-1", "tier-2", "tier-3", "tier-4", "low", "medium", "high", "critical"}
    tier := object.get(input.user, "tier", "unknown")
    tier in tiers
}

# Helper: Define protected paths
is_protected_path(path) if {
    protected_prefixes := [
        "policy/",
        ".github/",
        "docs/governance/",
        "security/"
    ]
    some prefix in protected_prefixes
    startswith(path, prefix)
}
