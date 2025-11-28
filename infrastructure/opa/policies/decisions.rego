package intelgraph.decisions

import rego.v1

# IntelGraph Decision and Claims Access Control Policy
# MIT License - Copyright (c) 2025 IntelGraph

# Default deny
default allow := false

# Import role hierarchy from rbac policy
import data.intelgraph.rbac.has_role
import data.intelgraph.rbac.same_tenant
import data.intelgraph.data_classification.sufficient_clearance

# ============================================================================
# Claim Permissions
# ============================================================================

# Anyone can read claims they have clearance for
allow if {
    input.action == "claim:read"
    same_tenant
    has_role(input.user.role, "viewer")
    claim_clearance_ok
}

# Analysts can create claims
allow if {
    input.action == "claim:create"
    same_tenant
    has_role(input.user.role, "analyst")
}

# Claim creators can update their own claims
allow if {
    input.action == "claim:update"
    same_tenant
    has_role(input.user.role, "analyst")
    input.user.id == input.resource.created_by
    input.resource.status != "verified"  # Cannot modify verified claims
}

# Investigators can update any claim
allow if {
    input.action == "claim:update"
    same_tenant
    has_role(input.user.role, "investigator")
    input.resource.status != "verified"
}

# Only investigators+ can verify claims
allow if {
    input.action == "claim:verify"
    same_tenant
    has_role(input.user.role, "investigator")
    input.user.id != input.resource.created_by  # Cannot verify own claims
}

# Supervisors can retract claims
allow if {
    input.action == "claim:retract"
    same_tenant
    has_role(input.user.role, "supervisor")
}

# Check claim clearance based on policy labels
claim_clearance_ok if {
    not claim_has_restricted_labels
}

claim_clearance_ok if {
    claim_has_restricted_labels
    has_role(input.user.role, "investigator")
}

claim_has_restricted_labels if {
    some label in input.resource.policy_labels
    label in ["restricted", "classified", "pii"]
}

# ============================================================================
# Evidence Permissions
# ============================================================================

# Viewers can read evidence with clearance
allow if {
    input.action == "evidence:read"
    same_tenant
    has_role(input.user.role, "viewer")
    evidence_clearance_ok
}

# Analysts can create evidence
allow if {
    input.action == "evidence:create"
    same_tenant
    has_role(input.user.role, "analyst")
}

# Analysts can attach evidence to claims
allow if {
    input.action == "evidence:attach"
    same_tenant
    has_role(input.user.role, "analyst")
}

# Evidence creators can update metadata
allow if {
    input.action == "evidence:update"
    same_tenant
    has_role(input.user.role, "analyst")
    input.user.id == input.resource.created_by
}

# Investigators can update any evidence
allow if {
    input.action == "evidence:update"
    same_tenant
    has_role(input.user.role, "investigator")
}

# Check evidence clearance
evidence_clearance_ok if {
    not evidence_has_restricted_labels
}

evidence_clearance_ok if {
    evidence_has_restricted_labels
    has_role(input.user.role, "investigator")
}

evidence_has_restricted_labels if {
    some label in input.resource.policy_labels
    label in ["restricted", "classified", "pii"]
}

# ============================================================================
# Decision Permissions
# ============================================================================

# Analysts can view decisions
allow if {
    input.action == "decision:read"
    same_tenant
    has_role(input.user.role, "analyst")
    decision_access_granted
}

# Decision access based on involvement
decision_access_granted if {
    input.user.id == input.resource.created_by
}

decision_access_granted if {
    input.user.id == input.resource.decision_maker_id
}

decision_access_granted if {
    some approval in input.resource.approval_chain
    approval.approver_id == input.user.id
}

decision_access_granted if {
    has_role(input.user.role, "supervisor")
}

# Analysts can create decisions
allow if {
    input.action == "decision:create"
    same_tenant
    has_role(input.user.role, "analyst")
}

# Decision creators can update draft decisions
allow if {
    input.action == "decision:update"
    same_tenant
    has_role(input.user.role, "analyst")
    input.user.id == input.resource.created_by
    input.resource.status == "draft"
}

# Investigators can update pending decisions
allow if {
    input.action == "decision:update"
    same_tenant
    has_role(input.user.role, "investigator")
    input.resource.status in ["draft", "pending_review"]
}

# Only supervisors+ can approve decisions
allow if {
    input.action == "decision:approve"
    same_tenant
    has_role(input.user.role, "supervisor")
    input.resource.status == "pending_approval"
    input.user.id != input.resource.created_by  # Cannot approve own decision
    approval_requirements_met
}

# Approval requirements
approval_requirements_met if {
    input.resource.confidence_score >= 0.7
}

approval_requirements_met if {
    input.resource.confidence_score < 0.7
    count(input.resource.approval_chain) >= 2  # Low confidence needs 2 approvers
}

# Supervisors can reject decisions
allow if {
    input.action == "decision:reject"
    same_tenant
    has_role(input.user.role, "supervisor")
    input.resource.status == "pending_approval"
}

# Only admins can delete decisions
allow if {
    input.action == "decision:delete"
    same_tenant
    has_role(input.user.role, "admin")
    input.resource.status == "draft"  # Can only delete drafts
}

# ============================================================================
# Disclosure Pack Permissions
# ============================================================================

# Investigators can generate disclosure packs
allow if {
    input.action == "disclosure:generate"
    same_tenant
    has_role(input.user.role, "investigator")
    decision_access_granted
}

# Disclosure packs require justification for export
allow if {
    input.action == "disclosure:export"
    same_tenant
    has_role(input.user.role, "investigator")
    input.request.justification != ""
    count(input.request.justification) >= 20
}

# Supervisors can export without justification
allow if {
    input.action == "disclosure:export"
    same_tenant
    has_role(input.user.role, "supervisor")
}

# Verify disclosure pack integrity
allow if {
    input.action == "disclosure:verify"
    same_tenant
    has_role(input.user.role, "viewer")
}

# ============================================================================
# Maestro Run Permissions
# ============================================================================

# Analysts can trigger decision runs
allow if {
    input.action == "maestro:run:create"
    same_tenant
    has_role(input.user.role, "analyst")
    run_budget_ok
}

# Check run budget constraints
run_budget_ok if {
    not input.workflow.budget
}

run_budget_ok if {
    input.workflow.budget.max_cost_usd <= 10  # Analyst limit
}

run_budget_ok if {
    input.workflow.budget.max_cost_usd <= 100
    has_role(input.user.role, "investigator")
}

run_budget_ok if {
    has_role(input.user.role, "supervisor")  # No limit
}

# View run status
allow if {
    input.action == "maestro:run:read"
    same_tenant
    has_role(input.user.role, "analyst")
    input.user.id == input.resource.triggered_by
}

allow if {
    input.action == "maestro:run:read"
    same_tenant
    has_role(input.user.role, "investigator")
}

# Cancel runs
allow if {
    input.action == "maestro:run:cancel"
    same_tenant
    has_role(input.user.role, "analyst")
    input.user.id == input.resource.triggered_by
    input.resource.status == "running"
}

allow if {
    input.action == "maestro:run:cancel"
    same_tenant
    has_role(input.user.role, "supervisor")
}

# ============================================================================
# Audit Requirements
# ============================================================================

# Determine if action requires audit logging
audit_required if {
    input.action in [
        "claim:create", "claim:update", "claim:verify", "claim:retract",
        "evidence:create", "evidence:attach",
        "decision:create", "decision:update", "decision:approve", "decision:reject",
        "disclosure:generate", "disclosure:export",
        "maestro:run:create", "maestro:run:cancel"
    ]
}

# Generate audit metadata
audit_metadata := {
    "action": input.action,
    "user_id": input.user.id,
    "user_role": input.user.role,
    "tenant_id": input.user.tenant_id,
    "resource_type": input.resource.type,
    "resource_id": input.resource.id,
    "timestamp": time.now_ns(),
    "requires_review": requires_additional_review
} if audit_required

# Flag actions that need additional review
requires_additional_review if {
    input.action == "decision:approve"
    input.resource.confidence_score < 0.5
}

requires_additional_review if {
    input.action == "disclosure:export"
    some label in input.resource.policy_labels
    label in ["restricted", "classified"]
}
