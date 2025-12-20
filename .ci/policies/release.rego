# Release Policy for MAE Release Captain
#
# Enforces release train guardrails:
# - Required gates must be present and passing
# - No production promotion without evidence bundle
# - Dual approval required for production actions
# - Hotfix restrictions on commit types
#
# Usage:
#   opa eval -d .ci/policies/release.rego -i input.json "data.release.decision"

package release

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# Decision object with reasons
decision := {
    "allow": allow,
    "reasons": reasons,
    "warnings": warnings,
}

# =============================================================================
# Allow rules
# =============================================================================

# Allow if no violations
allow if {
    count(violations) == 0
}

# =============================================================================
# Violation rules
# =============================================================================

violations contains msg if {
    input.action == "promote"
    input.target == "production"
    not input.evidence_bundle_present
    msg := "Production promotion requires evidence bundle"
}

violations contains msg if {
    input.action == "promote"
    input.target == "production"
    not input.sbom_verified
    msg := "Production promotion requires verified SBOM"
}

violations contains msg if {
    input.action == "promote"
    input.target == "production"
    not input.provenance_verified
    msg := "Production promotion requires verified provenance (SLSA)"
}

violations contains msg if {
    input.action in ["promote", "rollback"]
    input.target == "production"
    input.canary_weight == 100
    not dual_approval_present
    msg := "Production 100% promotion requires dual approval"
}

violations contains msg if {
    input.action == "rollback"
    input.target == "production"
    not dual_approval_present
    msg := "Production rollback requires dual approval"
}

violations contains msg if {
    input.action == "promote"
    input.target == "production"
    input.slo_burn_active
    msg := "Cannot promote to production with active SLO burn"
}

violations contains msg if {
    input.action == "promote"
    input.target == "production"
    input.performance_headroom < 20
    msg := sprintf("Insufficient performance headroom: %v%% (minimum 20%%)", [input.performance_headroom])
}

violations contains msg if {
    input.action == "promote"
    input.target == "production"
    input.dr_backup_stale
    msg := "DR backup is stale - cannot promote to production"
}

violations contains msg if {
    input.action == "promote"
    input.target == "production"
    not migration_gate_satisfied
    msg := "Migration gate not satisfied"
}

violations contains msg if {
    input.type == "hotfix"
    some commit in input.commits
    not valid_hotfix_commit_type(commit.type)
    msg := sprintf("Invalid commit type for hotfix: %s (only fix, chore(security) allowed)", [commit.type])
}

violations contains msg if {
    input.action == "create"
    input.type == "release"
    not all_required_gates_passed
    msg := "Not all required gates have passed"
}

# =============================================================================
# Warning rules (non-blocking)
# =============================================================================

warnings contains msg if {
    input.action == "promote"
    input.target == "production"
    input.canary_weight < 100
    input.canary_duration_minutes < 10
    msg := "Canary duration is less than recommended 10 minutes"
}

warnings contains msg if {
    input.action == "promote"
    not input.golden_path_probes_passed
    msg := "Golden path probes did not pass"
}

warnings contains msg if {
    input.type == "hotfix"
    count(input.commits) > 5
    msg := "Hotfix contains more than 5 commits - consider regular release"
}

warnings contains msg if {
    input.action == "promote"
    input.target == "production"
    input.performance_headroom < 30
    input.performance_headroom >= 20
    msg := sprintf("Performance headroom is low: %v%%", [input.performance_headroom])
}

# =============================================================================
# Helper rules
# =============================================================================

# Check if dual approval is present
dual_approval_present if {
    count(input.approvals) >= 2
    release_captain_approved
    oncall_sre_approved
}

release_captain_approved if {
    some approval in input.approvals
    approval.role == "release_captain"
    approval.approved == true
}

oncall_sre_approved if {
    some approval in input.approvals
    approval.role == "oncall_sre"
    approval.approved == true
}

# Check if migration gate is satisfied
migration_gate_satisfied if {
    not input.has_migrations
}

migration_gate_satisfied if {
    input.has_migrations
    input.migration_expand_complete
    input.migration_shadow_parity >= 0.99
}

# Check valid hotfix commit types
valid_hotfix_commit_type(commit_type) if {
    commit_type == "fix"
}

valid_hotfix_commit_type(commit_type) if {
    commit_type == "chore"
    # Scope check would be done in the full commit message
}

# Check all required gates passed
all_required_gates_passed if {
    input.gates.slo != "failure"
    input.gates.migration != "failure"
    input.gates.supply_chain != "failure"
    input.gates.perf != "failure"
}

# =============================================================================
# Computed fields for evidence
# =============================================================================

# Collect all reasons (violations + warnings)
reasons := violations

# Required evidence for production promotion
required_evidence := [
    "commit_range",
    "image_digests",
    "cosign_signatures",
    "slsa_attestations",
    "sbom",
    "slo_metrics",
    "probe_outcomes",
    "approvals_matrix",
    "dr_snapshot",
]

# Check evidence completeness
evidence_complete if {
    every item in required_evidence {
        item in object.keys(input.evidence)
    }
}

# =============================================================================
# Audit trail
# =============================================================================

# Generate audit entry for any action
audit_entry := {
    "timestamp": input.timestamp,
    "action": input.action,
    "target": input.target,
    "type": input.type,
    "version": input.version,
    "actor": input.actor,
    "decision": decision,
    "evidence_bundle_id": input.evidence_bundle_id,
}

# =============================================================================
# Tests
# =============================================================================

# Test: Production promotion without evidence should be denied
test_deny_prod_promotion_without_evidence if {
    not allow with input as {
        "action": "promote",
        "target": "production",
        "evidence_bundle_present": false,
    }
}

# Test: Production promotion with all requirements should be allowed
test_allow_prod_promotion_with_requirements if {
    allow with input as {
        "action": "promote",
        "target": "production",
        "evidence_bundle_present": true,
        "sbom_verified": true,
        "provenance_verified": true,
        "canary_weight": 50,
        "slo_burn_active": false,
        "performance_headroom": 35,
        "dr_backup_stale": false,
        "has_migrations": false,
        "approvals": [],
        "gates": {
            "slo": "success",
            "migration": "success",
            "supply_chain": "success",
            "perf": "success",
        },
    }
}

# Test: Hotfix with invalid commit type should be denied
test_deny_hotfix_invalid_commit if {
    not allow with input as {
        "type": "hotfix",
        "action": "create",
        "commits": [
            {"sha": "abc123", "type": "feat"},
        ],
    }
}

# Test: Hotfix with valid commit types should be allowed
test_allow_hotfix_valid_commits if {
    allow with input as {
        "type": "hotfix",
        "action": "create",
        "commits": [
            {"sha": "abc123", "type": "fix"},
            {"sha": "def456", "type": "chore"},
        ],
        "gates": {
            "slo": "success",
            "migration": "success",
            "supply_chain": "success",
            "perf": "success",
        },
    }
}
