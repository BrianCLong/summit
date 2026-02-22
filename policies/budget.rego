# IntelGraph Budget Policy: OPA Rego rules for tenant caps + four-eyes approval
# Usage: opa eval -d policies/ -i input.json "data.intelgraph.budget.allow"

package intelgraph.budget

import future.keywords.if
import future.keywords.in

# Default deny - all budget requests must be explicitly allowed
default allow := false

# Main authorization decision
allow if {
    # Check basic budget constraints first
    within_budget_limits
    
    # Then check if four-eyes approval is needed
    not requires_four_eyes
}

allow if {
    # Allow with four-eyes approval even if over normal limits
    within_emergency_limits
    has_valid_four_eyes_approval
}

# Core budget constraint checking
within_budget_limits if {
    input.est_usd <= monthly_room[input.tenant_id]
    input.est_usd <= daily_room[input.tenant_id]
}

# Emergency budget limits (higher thresholds for four-eyes scenarios)
within_emergency_limits if {
    input.est_usd <= emergency_monthly_room[input.tenant_id]
    input.est_usd <= emergency_daily_room[input.tenant_id]
}

# Four-eyes requirement logic
requires_four_eyes if {
    # High-cost operations always require approval
    input.est_usd > data.global_config.four_eyes_threshold_usd
}

requires_four_eyes if {
    # Destructive operations require approval regardless of cost
    input.risk_tag in ["destructive", "bulk_delete", "merge_entities", "purge"]
}

requires_four_eyes if {
    # Operations on sensitive tenants require approval
    input.tenant_id in data.sensitive_tenants
}

requires_four_eyes if {
    # Large token operations require approval
    input.est_total_tokens > data.global_config.four_eyes_threshold_tokens
}

requires_four_eyes if {
    # Critical infrastructure mutations require approval
    input.mutation_category in ["infrastructure", "configuration", "security"]
}

# Four-eyes approval validation
has_valid_four_eyes_approval if {
    count(valid_approvers) >= 2
    # Approvers must be different from requestor
    not input.user_id in valid_approver_ids
}

# Valid approvers (must have sufficient role and recent approval)
valid_approvers := {approver |
    some approver in input.approvers
    approver_has_sufficient_role(approver)
    approval_is_recent(approver)
    approver_is_authenticated(approver)
}

valid_approver_ids := {approver.user_id | some approver in valid_approvers}

# Approver role validation
approver_has_sufficient_role(approver) if {
    approver.role in ["admin", "finance_admin", "senior_analyst"]
}

approver_has_sufficient_role(approver) if {
    # Team leads can approve for their own team/tenant
    approver.role == "team_lead"
    approver.tenant_id == input.tenant_id
}

# Approval recency check (within 1 hour)
approval_is_recent(approver) if {
    approval_time := time.parse_rfc3339_ns(approver.approved_at)
    current_time := time.now_ns()
    approval_time > (current_time - (60 * 60 * 1000000000)) # 1 hour in nanoseconds
}

# Approver authentication validation
approver_is_authenticated(approver) if {
    # Must have valid session token
    approver.session_token != ""
    approver.session_token != null
}

# Budget calculations - monthly room remaining
monthly_room[tenant] := room if {
    some tenant
    budget := data.tenant_budgets[tenant]
    spent := monthly_spending[tenant]
    room := budget.monthly_usd_limit - spent
    room >= 0
}

# Default to 0 if not defined above
monthly_room[tenant] := 0 if {
    not monthly_room_positive[tenant]
}

monthly_room_positive[tenant] if {
    some tenant
    budget := data.tenant_budgets[tenant]
    spent := monthly_spending[tenant]
    room := budget.monthly_usd_limit - spent
    room >= 0
}

# Emergency monthly room (120% of normal limit)
emergency_monthly_room[tenant] := room if {
    some tenant
    budget := data.tenant_budgets[tenant]
    spent := monthly_spending[tenant]
    emergency_limit := budget.monthly_usd_limit * 1.2
    room := emergency_limit - spent
    room >= 0
}

emergency_monthly_room[tenant] := 0 if {
    not emergency_monthly_room_positive[tenant]
}

emergency_monthly_room_positive[tenant] if {
    some tenant
    budget := data.tenant_budgets[tenant]
    spent := monthly_spending[tenant]
    emergency_limit := budget.monthly_usd_limit * 1.2
    room := emergency_limit - spent
    room >= 0
}

# Budget calculations - daily room remaining
daily_room[tenant] := room if {
    some tenant
    budget := data.tenant_budgets[tenant]
    budget.daily_usd_limit # Ensure daily limit is set
    spent := daily_spending[tenant]
    room := budget.daily_usd_limit - spent
    room >= 0
}

daily_room[tenant] := result if {
    not daily_room_explicit[tenant]
    result := monthly_room[tenant] / 30
}

daily_room_explicit[tenant] if {
    some tenant
    budget := data.tenant_budgets[tenant]
    budget.daily_usd_limit
    spent := daily_spending[tenant]
    room := budget.daily_usd_limit - spent
    room >= 0
}

# Emergency daily room (150% of normal daily limit)
emergency_daily_room[tenant] := room if {
    some tenant
    budget := data.tenant_budgets[tenant]
    budget.daily_usd_limit
    spent := daily_spending[tenant]
    emergency_limit := budget.daily_usd_limit * 1.5
    room := emergency_limit - spent
    room >= 0
}

emergency_daily_room[tenant] := result if {
    not emergency_daily_room_explicit[tenant]
    result := emergency_monthly_room[tenant] / 30
}

emergency_daily_room_explicit[tenant] if {
    some tenant
    budget := data.tenant_budgets[tenant]
    budget.daily_usd_limit
    spent := daily_spending[tenant]
    emergency_limit := budget.daily_usd_limit * 1.5
    room := emergency_limit - spent
    room >= 0
}

# Current month spending calculation
monthly_spending[tenant] := total if {
    some tenant
    entries := data.spending_ledger[tenant]
    current_month := time.format(time.now_ns(), "2006-01", "UTC")
    monthly_entries := [entry | 
        some entry in entries
        startswith(entry.created_at, current_month)
        entry.status in ["estimated", "reconciled"]
    ]
    total := sum([entry.total_usd | some entry in monthly_entries])
}

# Default spending to 0 if no entries
monthly_spending[tenant] := 0 if {
    not monthly_spending_exists[tenant]
}

monthly_spending_exists[tenant] if {
    some tenant
    entries := data.spending_ledger[tenant]
    current_month := time.format(time.now_ns(), "2006-01", "UTC")
    some entry in entries
    startswith(entry.created_at, current_month)
}

# Current day spending calculation  
daily_spending[tenant] := total if {
    some tenant
    entries := data.spending_ledger[tenant]
    current_date := time.format(time.now_ns(), "2006-01-02", "UTC")
    daily_entries := [entry | 
        some entry in entries
        startswith(entry.created_at, current_date)
        entry.status in ["estimated", "reconciled"]
    ]
    total := sum([entry.total_usd | some entry in daily_entries])
}

daily_spending[tenant] := 0 if {
    not daily_spending_exists[tenant]
}

daily_spending_exists[tenant] if {
    some tenant
    entries := data.spending_ledger[tenant]
    current_date := time.format(time.now_ns(), "2006-01-02", "UTC")
    some entry in entries
    startswith(entry.created_at, current_date)
}

# Risk assessment for operations
operation_risk_level := "high" if {
    input.est_usd > 10.0
} else = "medium" if {
    input.est_usd > 1.0
} else = "low" { true }

# Violation reasons for debugging
violation_reasons contains reason if {
    not within_budget_limits
    reason := sprintf("Monthly budget exceeded: $%.2f requested, $%.2f available", [
        input.est_usd, 
        monthly_room[input.tenant_id]
    ])
}

violation_reasons contains reason if {
    not within_budget_limits  
    reason := sprintf("Daily budget exceeded: $%.2f requested, $%.2f available", [
        input.est_usd,
        daily_room[input.tenant_id]  
    ])
}

violation_reasons contains reason if {
    requires_four_eyes
    not has_valid_four_eyes_approval
    reason := sprintf("Four-eyes approval required but not provided (risk: %s, cost: $%.2f)", [
        input.risk_tag,
        input.est_usd
    ])
}

violation_reasons contains reason if {
    requires_four_eyes
    count(valid_approvers) < 2
    reason := sprintf("Insufficient approvers: %d valid, 2 required", [count(valid_approvers)])
}

# Decision details for audit logging
decision := {
    "allow": allow,
    "tenant_id": input.tenant_id,
    "estimated_usd": input.est_usd,
    "monthly_room": monthly_room[input.tenant_id],
    "daily_room": daily_room[input.tenant_id],
    "requires_four_eyes": requires_four_eyes,
    "valid_approvers": count(valid_approvers),
    "risk_level": operation_risk_level,
    "violation_reasons": violation_reasons,
    "policy_version": "1.0.0",
    "evaluated_at": time.now_ns()
}

# Tenant-specific overrides for special cases
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

# Allow with tenant override
allow if {
    override := tenant_override[input.tenant_id]
    input.est_usd <= override.override_limit_usd
    override.bypass_four_eyes == true
}
