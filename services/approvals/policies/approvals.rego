# Policy-Gated Approvals - Core OPA Policies
# Package: intelgraph.approvals
#
# This policy bundle provides comprehensive approval workflow enforcement
# for high-risk operations in the Summit/IntelGraph platform.

package intelgraph.approvals
import future.keywords.if
import future.keywords.in



# ===========================================================================
# Policy Version
# ===========================================================================

policy_version := {"version": "1.0.0"}

# ===========================================================================
# Configuration Data
# ===========================================================================

# Default configuration (can be overridden via OPA data)
default_config := {
    "four_eyes_token_threshold": 100000,
    "four_eyes_usd_threshold": 5.0,
    "default_required_approvals": 2,
    "approval_timeout_hours": 72,
    "emergency_timeout_hours": 4
}

config := object.union(default_config, data.config) if {
    data.config
} else := default_config

# ===========================================================================
# Risk Tags that Require Approval
# ===========================================================================

high_risk_tags := {
    "destructive",
    "bulk_delete",
    "merge_entities",
    "purge",
    "cross_tenant_move",
    "bulk_update",
    "schema_change",
    "data_export",
    "prod_deploy",
    "config_change",
    "permission_grant",
    "high_value_payout"
}

# ===========================================================================
# Approver Role Definitions
# ===========================================================================

# Roles that can approve high-risk operations
approver_roles := {
    "admin",
    "tenant-admin",
    "security-admin",
    "finance-admin",
    "senior-analyst",
    "team-lead",
    "compliance-officer"
}

# Role hierarchy for approval (higher can approve lower)
role_level := {
    "admin": 100,
    "tenant-admin": 90,
    "security-admin": 85,
    "finance-admin": 85,
    "compliance-officer": 80,
    "team-lead": 70,
    "senior-analyst": 60,
    "analyst": 40,
    "viewer": 10
}

# ===========================================================================
# Evaluate Approval Request
# ===========================================================================

# Main entry point for evaluating if an action requires approval
evaluate_request := result if {
    result := {
        "allow": allow_without_approval,
        "require_approval": requires_approval,
        "required_approvals": required_approval_count,
        "allowed_approver_roles": allowed_roles,
        "conditions": approval_conditions,
        "violations": violations,
        "policy_version": policy_version.version
    }
}

# ===========================================================================
# Allow Without Approval
# ===========================================================================

# Low-risk operations can proceed without approval
default allow_without_approval := false

allow_without_approval if {
    not requires_approval
    count(violations) == 0
}

# ===========================================================================
# Requires Approval Logic
# ===========================================================================

default requires_approval := true

# Check if operation requires approval based on various criteria
requires_approval if {
    is_high_risk_action
}

requires_approval if {
    is_high_value_operation
}

requires_approval if {
    is_production_environment
}

requires_approval if {
    affects_multiple_tenants
}

requires_approval if {
    input.attributes.risk_level == "high"
}

requires_approval if {
    input.attributes.risk_level == "critical"
}

# High-risk actions
is_high_risk_action if {
    input.attributes.risk_tag in high_risk_tags
}

is_high_risk_action if {
    input.action in {"delete", "purge", "deploy", "release", "grant_permission"}
}

is_high_risk_action if {
    input.resource.type in {"deployment", "payout", "permission", "config"}
}

# High-value operations (financial or resource intensive)
is_high_value_operation if {
    input.attributes.est_usd > config.four_eyes_usd_threshold
}

is_high_value_operation if {
    input.attributes.amount_usd > config.four_eyes_usd_threshold
}

is_high_value_operation if {
    input.attributes.est_total_tokens > config.four_eyes_token_threshold
}

# Production environment
is_production_environment if {
    input.resource.environment == "production"
}

is_production_environment if {
    input.context.environment == "production"
}

# Multiple tenants affected
affects_multiple_tenants if {
    input.attributes.affects_multiple_tenants == true
}

# ===========================================================================
# Required Approval Count
# ===========================================================================

# Calculate how many approvals are needed
required_approval_count := count if {
    is_critical_operation
    count := 3
} else := count if {
    is_high_risk_action
    is_production_environment
    count := 2
} else := count if {
    is_high_value_operation
    input.attributes.amount_usd > 50000
    count := 3
} else := count if {
    requires_approval
    count := config.default_required_approvals
} else := 0

is_critical_operation if {
    input.attributes.risk_level == "critical"
}

is_critical_operation if {
    input.action == "purge"
    input.resource.type == "tenant"
}

# ===========================================================================
# Allowed Approver Roles
# ===========================================================================

allowed_roles := roles if {
    # For finance operations, require finance approvers
    input.resource.type == "payout"
    roles := {"admin", "tenant-admin", "finance-admin", "compliance-officer"}
} else := roles if {
    # For security operations
    input.action in {"grant_permission", "revoke_permission"}
    roles := {"admin", "tenant-admin", "security-admin"}
} else := roles if {
    # For deployments
    input.resource.type == "deployment"
    roles := {"admin", "tenant-admin", "team-lead", "senior-analyst"}
} else := approver_roles

# ===========================================================================
# Approval Conditions
# ===========================================================================

approval_conditions := conditions if {
    conditions := array.concat(
        time_conditions,
        array.concat(environment_conditions, verification_conditions)
    )
}

# Time-based conditions
time_conditions := [condition] if {
    is_production_environment
    condition := {
        "type": "time_window",
        "constraint": "must_complete_within",
        "value": "4h",
        "description": "Production deployments must be completed within 4 hours of approval"
    }
} else := []

# Environment conditions
environment_conditions := [condition] if {
    input.resource.type == "deployment"
    input.attributes.rollback_plan != true
    condition := {
        "type": "requirement",
        "constraint": "rollback_plan_required",
        "value": "true",
        "description": "A rollback plan must be documented before approval"
    }
} else := []

# Verification conditions
verification_conditions := [condition] if {
    input.resource.type == "payout"
    input.attributes.amount_usd > 10000
    condition := {
        "type": "verification",
        "constraint": "recipient_verification",
        "value": "required",
        "description": "Recipient must be verified for payouts over $10,000"
    }
} else := []

# ===========================================================================
# Violations
# ===========================================================================

violations := v if {
    v := array.concat(
        tenant_violations,
        array.concat(clearance_violations, time_violations)
    )
}

# Tenant isolation violations
tenant_violations := ["Cross-tenant operation requires explicit approval flag"] if {
    affects_multiple_tenants
    not input.attributes.cross_tenant_approved
} else := []

# Clearance violations
clearance_violations := ["Insufficient clearance level for this resource"] if {
    required_clearance := input.resource.clearance_level
    actor_clearance := input.actor.attributes.clearance_level
    clearance_insufficient(actor_clearance, required_clearance)
} else := []

clearance_insufficient(actor, required) if {
    clearance_levels := {"unclassified": 0, "cui": 1, "confidential": 2, "secret": 3, "top-secret": 4}
    clearance_levels[actor] < clearance_levels[required]
}

# Time violations
time_violations := ["Operation not allowed outside business hours"] if {
    input.attributes.business_hours_only == true
    not is_business_hours
} else := []

is_business_hours if {
    # Simplified check - in production would use proper timezone handling
    true
}

# ===========================================================================
# Evaluate Decision
# ===========================================================================

# Entry point for evaluating if an actor can submit a decision
evaluate_decision := result if {
    result := {
        "allow": decision_allowed,
        "violations": decision_violations,
        "is_final": is_final_decision,
        "policy_version": policy_version.version
    }
}

# ===========================================================================
# Decision Allowed
# ===========================================================================

default decision_allowed := false

decision_allowed if {
    actor_can_approve
    not requestor_is_approver
    count(decision_violations) == 0
}

# Actor has an approver role
actor_can_approve if {
    some role in input.actor.roles
    role in input.allowed_approver_roles
}

# Requestor cannot approve their own request
requestor_is_approver if {
    some decision in input.existing_decisions
    decision.actor.id == input.actor.id
}

requestor_is_approver if {
    # Check if current actor is trying to approve their own request
    # This would need to be passed in the input
    input.actor.id == input.requestor_id
}

# ===========================================================================
# Decision Violations
# ===========================================================================

decision_violations := v if {
    v := array.concat(role_violations, duplicate_violations)
}

role_violations := ["Actor does not have an approved role for this action"] if {
    not actor_can_approve
} else := []

duplicate_violations := ["Actor has already submitted a decision"] if {
    some decision in input.existing_decisions
    decision.actor.id == input.actor.id
} else := []

# ===========================================================================
# Is Final Decision
# ===========================================================================

# Check if we have enough approvals after this decision
is_final_decision if {
    input.decision_type == "reject"
}

is_final_decision if {
    input.decision_type == "approve"
    approval_count := count_approvals + 1
    approval_count >= input.required_approvals
}

count_approvals := count([d |
    some d in input.existing_decisions
    d.decision == "approve"
])
