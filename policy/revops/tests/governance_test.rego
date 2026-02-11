import future.keywords.in
import future.keywords.if
package revops.governance_test

import data.revops.governance
import data.governance_inputs

# Golden path: compliant record should be allowed with no violations or SLA breaches.
test_governance_compliant if {
  test_input := governance_inputs.compliant
  decision := governance.decision with input as test_input

  decision.allowed
  count(decision.violations) == 0
  count(decision.sla_breaches) == 0
  decision.forecast_category == "commit"
  decision.policy_bundle_version == "revops-blueprint-v1"
}

# Stage evidence, naming, dedupe, and forecast rules should block invalid deals.
test_governance_enforces_stage_and_naming if {
  test_input := governance_inputs.invalid_stage_and_naming
  decision := governance.decision with input as test_input

  not decision.allowed
  decision.violations[_] == "deal_naming_invalid"
  decision.violations[_] == "dedupe_violation"
  decision.violations[_] == "stage_exit_missing_budget_owner_identified"
  decision.violations[_] == "next_step_missing"
  decision.violations[_] == "forecast_category_not_allowed"
  decision.violations[_] == "stage_aging_breach_proposal"
  decision.violations[_] == "mandatory_fields_missing"
  decision.risk_score > 0
}

# SLA clocks, manual routing bans, discount approvals, and stale detection must fire actions.
test_governance_flags_sla_and_quote_controls if {
  test_input := governance_inputs.sla_and_quote
  decision := governance.decision with input as test_input

  not decision.allowed
  decision.sla_breaches[_] == "speed_to_lead_breach"
  decision.sla_breaches[_] == "speed_to_meeting_breach"
  decision.violations[_] == "manual_routing_blocked"
  decision.violations[_] == "discount_approval_missing"
  decision.violations[_] == "stale_deal"
  decision.violations[_] == "round_robin_out_of_order"
  decision.violations[_] == "wip_limit_exceeded"
  decision.violations[_] == "change_control_not_approved"
  decision.violations[_] == "exception_expired"
  decision.violations[_] == "marketing_mql_sql_incomplete"
  decision.violations[_] == "partner_registration_missing"
  decision.violations[_] == "unauthorized_change"
  decision.actions[_] == "block_manual_routing"
  decision.actions[_] == "require_manager_review"
  decision.actions[_] == "rebalance_round_robin"
  decision.actions[_] == "shed_wip"
  decision.actions[_] == "enforce_change_control"
  decision.risk_score > 0
}

# Permissions, attribution hygiene, and partner routing must be enforced.
test_governance_permissions_and_attribution if {
  test_input := governance_inputs.permissions_and_attribution
  decision := governance.decision with input as test_input

  not decision.allowed
  decision.violations[_] == "marketing_utm_source_missing"
  decision.violations[_] == "marketing_utm_medium_missing"
  decision.violations[_] == "marketing_utm_campaign_missing"
  decision.violations[_] == "marketing_mql_sql_incomplete"
  decision.violations[_] == "unauthorized_change"
  decision.violations[_] == "partner_registration_missing"
  decision.violations[_] == "wip_limit_exceeded"
  decision.actions[_] == "rebalance_round_robin"
  decision.actions[_] == "enforce_change_control"
}
