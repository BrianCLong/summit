# IntelGraph Approval Policy: Four-eyes enforcement with emergency overrides
# Usage: opa eval -d policies/ -i input.json "data.intelgraph.approval"

package intelgraph.approval

# Default deny - all operations must be explicitly allowed
default allow := false

# Risk tags requiring four-eyes approval regardless of cost
risk_tags := {
  "destructive", 
  "bulk_delete", 
  "merge_entities", 
  "purge",
  "cross_tenant_move",
  "bulk_update", 
  "schema_change", 
  "data_export"
}

# Four-eyes requirement logic
requires_four_eyes {
  # High-risk operations always require approval
  input.risk_tag != ""
  risk_tags[input.risk_tag]
}

requires_four_eyes {
  # Cost threshold: any operation >$5.00 requires approval
  input.est_usd > 5.0
}

requires_four_eyes {
  # Large token operations require approval (configurable threshold)
  input.est_total_tokens > data.config.four_eyes_token_threshold
}

requires_four_eyes {
  # Cross-tenant operations always require approval
  input.affects_multiple_tenants == true
}

# Main authorization logic
allow {
  # Standard path: within budget and no four-eyes required
  not requires_four_eyes
  within_budget_limits
}

allow {
  # Four-eyes path: within budget with valid approvals
  requires_four_eyes
  within_budget_limits
  has_valid_four_eyes_approval
}

allow {
  # Emergency override path: active time-limited override
  within_emergency_budget_limits
  has_active_override
}

# Budget constraint checking
within_budget_limits {
  input.est_usd <= input.daily_room
  input.est_usd <= input.monthly_room
}

# Emergency budget limits (with override multiplier)
within_emergency_budget_limits {
  override := active_overrides[_]
  multiplier := override.budget_multiplier
  input.est_usd <= (input.daily_room * multiplier)
  input.est_usd <= (input.monthly_room * multiplier)
}

# Four-eyes approval validation
has_valid_four_eyes_approval {
  count(valid_approvers) >= 2
  # Approvers must be different from requestor
  not approver_id_is_user_id
  # All approvers must be authenticated within last hour
  all_approvers_recent
}

approver_id_is_user_id {
    valid_approver_ids[_] == input.user_id
}

valid_approver_ids := {approver.user_id | approver := valid_approvers[_]}

# Valid approvers filtering
valid_approvers := {approver |
  approver := input.approvers[_]
  approver_has_sufficient_role(approver)
  approver_is_authenticated(approver)
  approval_is_recent(approver)
}

# Approver role validation
approver_has_sufficient_role(approver) {
  roles := {"admin", "finance_admin", "senior_analyst", "security_admin"}
  roles[approver.role]
}

approver_has_sufficient_role(approver) {
  # Team leads can approve for their own tenant/team
  approver.role == "team_lead"
  approver.tenant_id == input.tenant_id
}

approver_has_sufficient_role(approver) {
  # Special case: cross-tenant operations require higher privilege
  input.affects_multiple_tenants == true
  roles := {"admin", "security_admin"}
  roles[approver.role]
}

# Approver authentication validation
approver_is_authenticated(approver) {
  approver.session_token != ""
  approver.session_token != null
  # Could add session validation logic here
}

# Approval recency check (within 1 hour by default)
approval_is_recent(approver) {
  approval_time_ns := time.parse_rfc3339_ns(approver.approved_at)
  current_time_ns := time.now_ns()
  max_age_ns := data.config.approval_max_age_seconds * 1000000000  # Convert to nanoseconds
  approval_time_ns > (current_time_ns - max_age_ns)
}

# All approvers must be recent
all_approvers_recent {
  count(valid_approvers) > 0
  recent_approvers_count := count([approver |
    approver := valid_approvers[_]
    approval_is_recent(approver)
  ])
  recent_approvers_count == count(valid_approvers)
}

# Active override detection
has_active_override {
  count(active_overrides) > 0
}

# Get active overrides for tenant
active_overrides := [override |
  override := data.overrides[input.tenant_id][_]
  is_override_active(override)
  override_permits_operation(override)
]

# Override validity check
is_override_active(override) {
  current_time_ns := time.now_ns()
  expires_at_ns := time.parse_rfc3339_ns(override.expires_at)
  current_time_ns < expires_at_ns
  override.revoked_at == null
}

# Override permission check
override_permits_operation(override) {
  # Check if override allows unapproved operations
  requires_four_eyes
  override.allow_unapproved_ops == true
}

override_permits_operation(override) {
  # Override always allows budget increases
  override.budget_multiplier > 1.0
}

# Configuration defaults
default_config := {
  "four_eyes_token_threshold": 50000,
  "approval_max_age_seconds": 3600,  # 1 hour
  "emergency_budget_multiplier": 2.0,
  "max_override_duration_hours": 24
}

# Use provided config or defaults
config := object.union(default_config, data.config)

# Decision metadata for audit logging
decision := {
    "allow": allow,
    "tenant_id": input.tenant_id,
    "user_id": input.user_id,
    "operation": input.operation,
    "est_usd": input.est_usd,
    "daily_room": input.daily_room,
    "monthly_room": input.monthly_room,
    "requires_four_eyes": requires_four_eyes_val,
    "valid_approvers": count(valid_approvers),
    "active_overrides": count(active_overrides),
    "risk_level": r_level,
    "violation_reasons": v_reasons,
    "policy_version": "2.0.0-canary",
    "evaluated_at": time.now_ns()
} {
  requires_four_eyes_val := is_requires_four_eyes
  r_level := risk_level
  v_reasons := violation_reasons
}

is_requires_four_eyes {
  requires_four_eyes
}
else = false

# Risk level assessment
risk_level = "critical" {
  risk_tags_critical := {"destructive", "purge", "cross_tenant_move"}
  risk_tags_critical[input.risk_tag]
}
else = "high" {
  input.est_usd > 10.0
}
else = "medium" {
  input.est_usd > 1.0
}
else = "low"

# Violation reasons for debugging
violation_reasons[reason] {
  not within_budget_limits
  reason := sprintf("Budget exceeded: daily $%.2f/$%.2f, monthly $%.2f/$%.2f", [
    input.est_usd, input.daily_room,
    input.est_usd, input.monthly_room
  ])
}

violation_reasons[reason] {
  requires_four_eyes
  not has_valid_four_eyes_approval
  not has_active_override
  reason := sprintf("Four-eyes approval required: %s (cost: $%.2f, approvers: %d/2)", [
    input.risk_tag,
    input.est_usd,
    count(valid_approvers)
  ])
}

violation_reasons[reason] {
  requires_four_eyes
  has_valid_four_eyes_approval
  count(valid_approvers) < 2
  reason := sprintf("Insufficient valid approvers: %d of %d valid", [
    count(valid_approvers),
    count(input.approvers)
  ])
}

violation_reasons[reason] {
  not within_budget_limits
  not within_emergency_budget_limits
  reason := "Emergency budget limits also exceeded"
}

# Helper queries for monitoring/debugging
tenant_status[tenant] = status {
  budget := data.tenant_budgets[tenant]
  spending := data.daily_spending[tenant]
  status := {
    "daily_limit": budget.daily_usd_limit,
    "current_spend": spending,
    "utilization": (spending / budget.daily_usd_limit) * 100,
    "overrides": count(data.overrides[tenant])
  }
}

# Summary stats for operational dashboards
summary := {
  "total_tenants": count(object.keys(data.tenant_budgets)),
  "canary_tenants": count([t | t := object.keys(data.tenant_budgets)[_]; data.tenant_budgets[t].canary == true]),
  "active_overrides": sum([count(data.overrides[t]) | t := object.keys(data.overrides)[_]]),
  "high_risk_operations": count([op | op := data.recent_operations[_]; risk_tags[op.risk_tag]])
}
