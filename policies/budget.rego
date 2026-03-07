# IntelGraph Budget Policy: OPA Rego rules for tenant caps + four-eyes approval
package intelgraph.budget

import rego.v1

# Default deny - all budget requests must be explicitly allowed
default allow := false

# Main authorization decision
allow if {
    within_budget_limits
    not requires_four_eyes
}

allow if {
    within_emergency_limits
    has_valid_four_eyes_approval
}

within_budget_limits if {
    input.est_usd <= monthly_room[input.tenant_id]
    input.est_usd <= daily_room[input.tenant_id]
}

within_emergency_limits if {
    input.est_usd <= emergency_monthly_room[input.tenant_id]
    input.est_usd <= emergency_daily_room[input.tenant_id]
}

requires_four_eyes if {
    input.est_usd > data.global_config.four_eyes_threshold_usd
}

requires_four_eyes if {
    input.risk_tag in ["destructive", "bulk_delete", "merge_entities", "purge"]
}

requires_four_eyes if {
    input.tenant_id in data.sensitive_tenants
}

requires_four_eyes if {
    input.est_total_tokens > data.global_config.four_eyes_threshold_tokens
}

requires_four_eyes if {
    input.mutation_category in ["infrastructure", "configuration", "security"]
}

has_valid_four_eyes_approval if {
    count(valid_approvers) >= 2
    not input.user_id in valid_approver_ids
}

valid_approvers := {approver |
    some approver in input.approvers
    approver_has_sufficient_role(approver)
    approval_is_recent(approver)
    approver_is_authenticated(approver)
}

valid_approver_ids := {approver.user_id | some approver in valid_approvers}

approver_has_sufficient_role(approver) if {
    approver.role in ["admin", "finance_admin", "senior_analyst"]
}

approver_has_sufficient_role(approver) if {
    approver.role == "team_lead"
    approver.tenant_id == input.tenant_id
}

approval_is_recent(approver) if {
    approval_time := time.parse_rfc3339_ns(approver.approved_at)
    current_time := time.now_ns()
    approval_time > (current_time - (60 * 60 * 1000000000))
}

approver_is_authenticated(approver) if {
    approver.session_token != ""
    approver.session_token != null
}

# Fix: Use separate rules for the mapping and a default
monthly_room[tenant] := room if {
    some tenant
    budget := data.tenant_budgets[tenant]
    spent := monthly_spending[tenant]
    room := budget.monthly_usd_limit - spent
    room >= 0
}

emergency_monthly_room[tenant] := room if {
    some tenant
    budget := data.tenant_budgets[tenant]
    spent := monthly_spending[tenant]
    emergency_limit := budget.monthly_usd_limit * 1.2
    room := emergency_limit - spent
    room >= 0
}

daily_room[tenant] := room if {
    some tenant
    budget := data.tenant_budgets[tenant]
    budget.daily_usd_limit
    spent := daily_spending[tenant]
    room := budget.daily_usd_limit - spent
    room >= 0
}

emergency_daily_room[tenant] := room if {
    some tenant
    budget := data.tenant_budgets[tenant]
    budget.daily_usd_limit
    spent := daily_spending[tenant]
    emergency_limit := budget.daily_usd_limit * 1.5
    room := emergency_limit - spent
    room >= 0
}

monthly_spending[tenant] := total if {
    some tenant
    entries := data.spending_ledger[tenant]
    current_month := time.format([time.now_ns(), "UTC", "2006-01"])
    monthly_entries := [entry | 
        some entry in entries
        startswith(entry.created_at, current_month)
        entry.status in ["estimated", "reconciled"]
    ]
    total := sum([entry.total_usd | some entry in monthly_entries])
}

daily_spending[tenant] := total if {
    some tenant
    entries := data.spending_ledger[tenant]
    current_date := time.format([time.now_ns(), "UTC", "2006-01-02"])
    daily_entries := [entry | 
        some entry in entries
        startswith(entry.created_at, current_date)
        entry.status in ["estimated", "reconciled"]
    ]
    total := sum([entry.total_usd | some entry in daily_entries])
}

operation_risk_level := "high" if {
    input.est_usd > 10.0
} else := "medium" if {
    input.est_usd > 1.0
} else := "low"

violation_reasons contains reason if {
    not within_budget_limits
    reason := sprintf("Monthly budget exceeded: $%.2f requested", [input.est_usd])
}

violation_reasons contains reason if {
    requires_four_eyes
    not has_valid_four_eyes_approval
    reason := sprintf("Four-eyes approval required but not provided (risk: %s, cost: $%.2f)", [
        input.risk_tag,
        input.est_usd
    ])
}

decision := {
    "allow": allow,
    "tenant_id": input.tenant_id,
    "estimated_usd": input.est_usd,
    "requires_four_eyes": requires_four_eyes,
    "valid_approvers": count(valid_approvers),
    "risk_level": operation_risk_level,
    "violation_reasons": violation_reasons,
    "policy_version": "1.0.0",
    "evaluated_at": time.now_ns()
}

tenant_override[tenant] := override if {
    some tenant
    override := data.tenant_overrides[tenant]
    override.active == true
    override_is_current(override)
}

override_is_current(override) if {
    start_time := time.parse_rfc3339_ns(override.valid_from)
    end_time := time.parse_rfc3339_ns(override.valid_until)
    current_time := time.now_ns()
    start_time <= current_time
    current_time <= end_time
}

allow if {
    override := tenant_override[input.tenant_id]
    input.est_usd <= override.override_limit_usd
    override.bypass_four_eyes == true
}
