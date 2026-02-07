import future.keywords
# Unit tests for approval policies
package intelgraph.approvals_test

import rego.v1
import data.intelgraph.approvals

# ===========================================================================
# Test: Policy Version
# ===========================================================================

test_policy_version_exists if {
    approvals.policy_version.version == "1.0.0"
}

# ===========================================================================
# Test: High Risk Actions Require Approval
# ===========================================================================

test_deployment_requires_approval if {
    result := approvals.evaluate_request with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["developer"]},
        "resource": {"type": "deployment", "id": "deploy-1", "environment": "production"},
        "action": "deploy",
        "attributes": {},
        "context": {}
    }
    result.require_approval == true
}

test_delete_requires_approval if {
    result := approvals.evaluate_request with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["analyst"]},
        "resource": {"type": "entity", "id": "entity-1"},
        "action": "delete",
        "attributes": {},
        "context": {}
    }
    result.require_approval == true
}

test_high_value_payout_requires_approval if {
    result := approvals.evaluate_request with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["finance-analyst"]},
        "resource": {"type": "payout", "id": "payout-1"},
        "action": "release",
        "attributes": {"amount_usd": 50000},
        "context": {}
    }
    result.require_approval == true
    result.required_approvals >= 2
}

# ===========================================================================
# Test: Low Risk Actions Don't Require Approval
# ===========================================================================

test_read_action_no_approval if {
    result := approvals.evaluate_request with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["analyst"]},
        "resource": {"type": "report", "id": "report-1"},
        "action": "read",
        "attributes": {"risk_level": "low"},
        "context": {}
    }
    # Even read might require approval by default, but with low risk it shouldn't
    result.require_approval == false
}

# ===========================================================================
# Test: Allowed Approver Roles
# ===========================================================================

test_finance_operation_requires_finance_approver if {
    result := approvals.evaluate_request with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["finance-analyst"]},
        "resource": {"type": "payout", "id": "payout-1"},
        "action": "release",
        "attributes": {"amount_usd": 10000},
        "context": {}
    }
    "finance-admin" in result.allowed_approver_roles
}

test_deployment_requires_team_lead if {
    result := approvals.evaluate_request with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["developer"]},
        "resource": {"type": "deployment", "id": "deploy-1"},
        "action": "deploy",
        "attributes": {},
        "context": {}
    }
    "team-lead" in result.allowed_approver_roles
}

# ===========================================================================
# Test: Decision Evaluation
# ===========================================================================

test_approver_can_approve if {
    result := approvals.evaluate_decision with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "approver-1", "roles": ["team-lead"]},
        "resource": {"type": "deployment", "id": "deploy-1"},
        "action": "deploy",
        "decision_type": "approve",
        "existing_decisions": [],
        "required_approvals": 2,
        "allowed_approver_roles": ["admin", "team-lead", "security-admin"]
    }
    result.allow == true
}

test_non_approver_cannot_approve if {
    result := approvals.evaluate_decision with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["viewer"]},
        "resource": {"type": "deployment", "id": "deploy-1"},
        "action": "deploy",
        "decision_type": "approve",
        "existing_decisions": [],
        "required_approvals": 2,
        "allowed_approver_roles": ["admin", "team-lead", "security-admin"]
    }
    result.allow == false
    "Actor does not have an approved role for this action" in result.violations
}

test_duplicate_approver_blocked if {
    result := approvals.evaluate_decision with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "approver-1", "roles": ["team-lead"]},
        "resource": {"type": "deployment", "id": "deploy-1"},
        "action": "deploy",
        "decision_type": "approve",
        "existing_decisions": [
            {"actor": {"id": "approver-1"}, "decision": "approve"}
        ],
        "required_approvals": 2,
        "allowed_approver_roles": ["admin", "team-lead"]
    }
    result.allow == false
    "Actor has already submitted a decision" in result.violations
}

# ===========================================================================
# Test: Final Decision Detection
# ===========================================================================

test_rejection_is_final if {
    result := approvals.evaluate_decision with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "approver-1", "roles": ["team-lead"]},
        "resource": {"type": "deployment", "id": "deploy-1"},
        "action": "deploy",
        "decision_type": "reject",
        "existing_decisions": [],
        "required_approvals": 2,
        "allowed_approver_roles": ["admin", "team-lead"]
    }
    result.is_final == true
}

test_second_approval_is_final if {
    result := approvals.evaluate_decision with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "approver-2", "roles": ["admin"]},
        "resource": {"type": "deployment", "id": "deploy-1"},
        "action": "deploy",
        "decision_type": "approve",
        "existing_decisions": [
            {"actor": {"id": "approver-1"}, "decision": "approve"}
        ],
        "required_approvals": 2,
        "allowed_approver_roles": ["admin", "team-lead"]
    }
    result.is_final == true
}

test_first_approval_not_final if {
    result := approvals.evaluate_decision with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "approver-1", "roles": ["team-lead"]},
        "resource": {"type": "deployment", "id": "deploy-1"},
        "action": "deploy",
        "decision_type": "approve",
        "existing_decisions": [],
        "required_approvals": 2,
        "allowed_approver_roles": ["admin", "team-lead"]
    }
    result.is_final == false
}

# ===========================================================================
# Test: Conditions Generation
# ===========================================================================

test_production_deployment_has_time_condition if {
    result := approvals.evaluate_request with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["developer"]},
        "resource": {"type": "deployment", "id": "deploy-1", "environment": "production"},
        "action": "deploy",
        "attributes": {},
        "context": {}
    }
    some condition in result.conditions
    condition.type == "time_window"
}

# ===========================================================================
# Test: Violations
# ===========================================================================

test_cross_tenant_without_flag_has_violation if {
    result := approvals.evaluate_request with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["admin"]},
        "resource": {"type": "data", "id": "data-1"},
        "action": "move",
        "attributes": {"affects_multiple_tenants": true},
        "context": {}
    }
    "Cross-tenant operation requires explicit approval flag" in result.violations
}

test_cross_tenant_with_flag_no_violation if {
    result := approvals.evaluate_request with input as {
        "tenant_id": "tenant-1",
        "actor": {"id": "user-1", "roles": ["admin"]},
        "resource": {"type": "data", "id": "data-1"},
        "action": "move",
        "attributes": {
            "affects_multiple_tenants": true,
            "cross_tenant_approved": true
        },
        "context": {}
    }
    not "Cross-tenant operation requires explicit approval flag" in result.violations
}
