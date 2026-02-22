package revops.governance

import future.keywords.contains

import future.keywords.in
import future.keywords.if

import data.revops.config
import data.revops.segments

default decision := {
  "allowed": false,
  "reason": "not_evaluated",
  "violations": [],
  "actions": [],
  "risk_score": 0,
  "flags": [],
  "sla_breaches": [],
  "forecast_category": "",
  "policy_bundle_version": "unknown",
  "naming": {}
}

policy_bundle_version := v if {
  v := config.bundle_version
}

policy_bundle_version := "unknown" if {
  not config.bundle_version
}

derive_reason(allowed) := "compliant" if {
  allowed
}

derive_reason(allowed) := "violations_present" if {
  not allowed
}

decision := out if {
  tenant_id := input.tenant.id
  segment := derive_segment

  naming := naming_summary
  violations := collect_violations(segment, tenant_id)
  sla_breaches := sla_breach
  all_flags := concat_arrays([naming.flags, violation_flag_list(violations), sla_flags(sla_breaches)])
  actions := recommended_actions(violations, sla_breaches)
  risk := compute_risk(segment, violations, sla_breaches)
  forecast := forecast_category(segment)

  allowed := count(violations) == 0
  reason := derive_reason(allowed)

  out := {
    "allowed": allowed,
    "reason": reason,
    "violations": violations,
    "actions": actions,
    "risk_score": risk,
    "flags": all_flags,
    "sla_breaches": sla_breaches,
    "forecast_category": forecast,
    "policy_bundle_version": policy_bundle_version,
    "naming": naming.summary
  }
}

################################################################################
# Segmentation & helpers
################################################################################

derive_segment := seg if {
  seg := input.opportunity.segment
}

derive_segment := seg if {
  not input.opportunity.segment
  seg := segments.segment_for_lead with input as {"lead": input.lead}
}

time_diff_minutes(start, end) := minutes if {
  start_ns := time.parse_rfc3339_ns(start)
  end_ns := time.parse_rfc3339_ns(end)
  delta_ns := end_ns - start_ns
  minutes := delta_ns / 60000000000
}

time_diff_hours(start, end) := hours if {
  minutes := time_diff_minutes(start, end)
  hours := minutes / 60
}

time_diff_days(start, end) := days if {
  minutes := time_diff_minutes(start, end)
  days := minutes / 1440
}

concat_arrays(arrs) := out if {
  out := [x | arrs[_][x]]
}

################################################################################
# Validation logic
################################################################################

collect_violations(segment, tenant_id) := out if {
  sor := system_of_record_violations
  locked := locked_definition_violation
  hygiene := get_hygiene_violations(segment, tenant_id)
  naming := naming_summary.flags
  routing := routing_violation
  q2c := get_quote_to_cash_violations(segment)
  forecast := forecast_violation
  lifecycle := lifecycle_violations
  governance := governance_violations
  permissions := permission_violations
  marketing := marketing_violations
  change_control := change_control_violations
  out := concat_arrays([sor, locked, hygiene, naming, routing, q2c, forecast, lifecycle, governance, permissions, marketing, change_control])
}

system_of_record_violations contains v if {
  input.lead
  input.lead.system_of_record != "crm"
  v := "lead_system_of_record_invalid"
}

system_of_record_violations contains v if {
  input.account
  input.account.system_of_record != "crm"
  v := "account_system_of_record_invalid"
}

system_of_record_violations contains v if {
  input.opportunity
  input.opportunity.system_of_record != "crm"
  v := "opportunity_system_of_record_invalid"
}

system_of_record_violations contains v if {
  input.quote
  input.quote.system_of_record != "cpq"
  v := "quote_system_of_record_invalid"
}

system_of_record_violations contains v if {
  input.contract
  input.contract.system_of_record != "clm"
  v := "contract_system_of_record_invalid"
}

system_of_record_violations contains v if {
  input.telemetry
  v := "telemetry_missing_system_of_record"
  not input.telemetry.system_of_record
}

locked_definition_violation contains "account_missing_domain" if {
  input.account
  input.account.domain == ""
}

locked_definition_violation contains "account_missing_billing_link" if {
  input.account
  not input.account.billing_account_id
}

locked_definition_violation contains "closed_won_without_contract" if {
  input.opportunity
  input.opportunity.stage == "closed_won"
  not closed_won_has_contract
}

closed_won_has_contract if {
  input.contract.status == "signed"
  input.opportunity.stage_evidence["contract_signed"]
}

locked_definition_violation contains "closed_lost_without_reason" if {
  input.opportunity
  input.opportunity.stage == "closed_lost"
  not input.opportunity.stage_evidence["loss_reason"]
}

get_hygiene_violations(segment, tenant_id) := concat_arrays([stage_exit_violations(segment), hygiene_violation]) if {
  true
}

stage_exit_violations(segment) := [v |
  input.opportunity
  cfg := config.governance.stage_exit[segment][input.opportunity.stage]
  some req in cfg
  not input.opportunity.stage_evidence[req]
  v := sprintf("stage_exit_missing_%s", [req])
]

hygiene_violation contains "next_step_missing" if {
  input.opportunity
  input.opportunity.next_step == ""
}

hygiene_violation contains "next_step_date_missing" if {
  input.opportunity
  input.opportunity.next_step_date == ""
}

hygiene_violation contains "mandatory_fields_missing" if {
  input.opportunity
  cfg := config.governance.data_quality.mandatory_fields
  missing := {f | f := cfg[_]; not mandatory_field_present(f)}
  count(missing) > 0
}

hygiene_violation contains "stale_deal" if {
  input.opportunity
  input.context.now
  last_touch := input.opportunity.last_activity_at
  days := time_diff_days(last_touch, input.context.now)
  days > config.governance.sla.stale_days
}

hygiene_violation contains v if {
  input.opportunity
  input.opportunity.stage_entered_at
  stage_limit := config.governance.sla.stage_aging_days[input.opportunity.stage]
  stage_limit > 0
  days := time_diff_days(input.opportunity.stage_entered_at, input.context.now)
  days > stage_limit
  v := sprintf("stage_aging_breach_%s", [input.opportunity.stage])
}

hygiene_violation contains "dedupe_violation" if {
  config.governance.data_quality.dedupe
  input.account
  count(input.account.duplicates) > 0
}

hygiene_violation contains "exception_without_expiry" if {
  some ex in input.exception_registry.open
  not ex.expires_at
}

hygiene_violation contains "exception_expired" if {
  ex := input.exception_registry.open[_]
  ex.expires_at
  time_diff_minutes(ex.expires_at, input.context.now) < 0
}

marketing_violations contains v if {
  input.marketing
  required := ["utm_source", "utm_medium", "utm_campaign", "lead_source"]
  some r in required
  marketing_field_missing(r)
  v := sprintf("marketing_%s_missing", [r])
}

marketing_field_missing(r) if {
  input.marketing[r] == ""
}

marketing_field_missing(r) if {
  not input.marketing[r]
}

marketing_violations contains "lead_source_unknown" if {
  input.marketing.lead_source == "unknown"
}

marketing_violations contains "marketing_mql_sql_incomplete" if {
  input.marketing
  not input.marketing.mql_status
}

marketing_violations contains "marketing_mql_sql_incomplete" if {
  input.marketing
  not input.marketing.sql_acceptance
}

naming_summary := {
  "summary": naming_summary_obj,
  "flags": naming_flag_list
} if {
  true
}

naming_summary_obj := object.union(
  object.union(
    object.union({"deal": input.opportunity.name}, campaign_obj),
    territory_obj
  ),
  skus_obj
)

campaign_obj := {"campaign": input.opportunity.campaign_name} if {
  input.opportunity.campaign_name
}

campaign_obj := {} if {
  not input.opportunity.campaign_name
}

territory_obj := {"territory": input.account.territory} if {
  input.account
}

territory_obj := {} if {
  not input.account
}

skus_obj := {"skus": input.quote.skus} if {
  input.quote
}

skus_obj := {} if {
  not input.quote
}

naming_flag_list := [f | naming_flags[f]]

naming_flags contains "deal_naming_invalid" if {
  input.opportunity
  not regex.match(config.governance.naming.deal_pattern, input.opportunity.name)
}

naming_flags contains "campaign_naming_invalid" if {
  input.opportunity.campaign_name
  not regex.match(config.governance.naming.campaign_pattern, input.opportunity.campaign_name)
}

naming_flags contains "territory_naming_invalid" if {
  input.account
  not regex.match(config.governance.naming.territory_pattern, input.account.territory)
}

naming_flags contains "sku_naming_invalid" if {
  some sku in input.quote.skus
  not regex.match(config.governance.naming.sku_pattern, sku)
}

routing_violation contains "manual_routing_blocked" if {
  input.opportunity.manual_routing_channel
  config.governance.routing.manual_channels_blocked[_] == input.opportunity.manual_routing_channel
}

routing_violation contains "tie_breaker_missing" if {
  expected := config.governance.routing.tie_breakers
  route_trace := input.opportunity.route_trace
  not equal_prefix(expected, route_trace)
}

routing_violation contains "round_robin_out_of_order" if {
  input.routing
  expected := input.routing.expected_position
  actual := input.routing.round_robin_position
  expected > 0
  actual != expected
}

routing_violation contains "wip_limit_exceeded" if {
  input.routing
  limit := input.routing.wip_limit
  limit > 0
  input.routing.queue_wip > limit
}

routing_violation contains "partner_registration_missing" if {
  input.routing
  input.marketing
  input.marketing.lead_source == "partner"
  not input.routing.partner_registered
}

get_quote_to_cash_violations(segment) := concat_arrays([segment_q2c_violations(segment), q2c_violation]) if {
  true
}

segment_q2c_violations(segment) := result if {
  input.quote
  floor := config.governance.quote_to_cash.floors[segment]
  ceil := config.governance.quote_to_cash.ceilings[segment]
  below_floor := ["sku_below_floor" | input.quote.total_value < floor]
  above_ceiling := ["quote_above_ceiling" | input.quote.total_value > ceil]
  result := array.concat(below_floor, above_ceiling)
}

segment_q2c_violations(segment) := [] if {
  not input.quote
}

q2c_violation contains "discount_approval_missing" if {
  input.quote
  required := approval_chain_for_discount(input.quote.discount_percentage)
  not approvals_superset(input.quote.required_approvals, required)
}

q2c_violation contains "renewal_not_created" if {
  input.contract
  input.contract.status == "signed"
  not input.contract.renewal_created
}

q2c_violation contains "order_form_not_ready" if {
  input.quote
  count([s | s := input.quote.skus[_]; regex.match(config.governance.naming.sku_pattern, s)]) == 0
}

forecast_violation contains "forecast_category_not_allowed" if {
  input.opportunity
  category := input.opportunity.forecast_category
  rule := config.governance.forecast.categories[category]
  min_stage := rule.min_stage
  not stage_at_least(input.opportunity.stage, min_stage)
}

forecast_violation contains "forecast_evidence_missing" if {
  input.opportunity
  category := input.opportunity.forecast_category
  rule := config.governance.forecast.categories[category]
  some req in rule.evidence
  not input.opportunity.stage_evidence[req]
}

lifecycle_violations contains "handoff_packet_missing" if {
  required := config.governance.handoffs.required_packets
  not handoffs_complete(required, input.handoffs.completed_packets)
}

lifecycle_violations contains "commitment_registry_missing" if {
  config.governance.handoffs.commitment_registry_required
  count(input.handoffs.commitment_registry) == 0
}

governance_violations contains "access_review_missing" if {
  config.governance.governance_controls.access_review_quarterly
  not input.governance_reviews
}

governance_violations contains "access_review_missing" if {
  config.governance.governance_controls.access_review_quarterly
  input.governance_reviews
  not input.governance_reviews.access_review_complete
}

governance_violations contains "audit_log_missing" if {
  config.governance.governance_controls.audit_logs_required
  not input.audit_logs_enabled
}

permission_violations contains "unauthorized_change" if {
  input.actor
  some target in input.context.change_targets
  not role_can_edit(input.actor.role, target)
}

change_control_violations contains "change_control_missing" if {
  input.context.change_targets[_]
  not input.change_control
}

change_control_violations contains "change_control_not_approved" if {
  input.change_control
  input.context.change_targets[_]
  not input.change_control.rfc_submitted
}

change_control_violations contains "change_control_not_approved" if {
  input.change_control
  input.context.change_targets[_]
  not input.change_control.approved
}

################################################################################
# SLA logic
################################################################################

sla_breach contains "speed_to_lead_breach" if {
  input.lead.received_at
  input.lead.first_touch_at
  mins := time_diff_minutes(input.lead.received_at, input.lead.first_touch_at)
  mins > config.governance.sla.speed_to_lead_minutes
}

sla_breach contains "speed_to_meeting_breach" if {
  input.lead.first_touch_at
  input.lead.first_meeting_at
  hours := time_diff_hours(input.lead.first_touch_at, input.lead.first_meeting_at)
  hours > config.governance.sla.speed_to_first_meeting_hours
}

sla_breach contains "stage_aging_sla_breach" if {
  input.opportunity.stage_entered_at
  limit := config.governance.sla.stage_aging_days[input.opportunity.stage]
  days := time_diff_days(input.opportunity.stage_entered_at, input.context.now)
  days > limit
}

sla_flags(breaches) := ["sla_breach" | breaches[_]]

################################################################################
# Forecast + risk
################################################################################

stage_at_least(stage, min) if {
  order := {"discovery": 1, "evaluation": 2, "proposal": 3, "negotiation": 4, "closed_won": 5, "closed_lost": 5}
  order[stage] >= order[min]
}

forecast_category(segment) := category if {
  input.opportunity
  category := input.opportunity.forecast_category
}

compute_risk(segment, violations, sla_breaches) := score if {
  base := count(violations) * 5
  sla_penalty := count(sla_breaches) * 3
  telemetry := telemetry_signal
  exec_penalty := executive_signal
  security_penalty := security_signal
  coverage_penalty := buying_committee_signal
  procurement_penalty := procurement_signal
  score := base + sla_penalty + telemetry + exec_penalty + security_penalty + coverage_penalty + procurement_penalty
}

telemetry_signal := 0 if {
  not input.telemetry
}

telemetry_signal := 5 if {
  input.telemetry
  input.telemetry.feature_depth < 0.3
}

telemetry_signal := 2 if {
  input.telemetry
  input.telemetry.feature_depth >= 0.3
  input.telemetry.feature_depth < 0.6
}

telemetry_signal := 0 if {
  input.telemetry
  input.telemetry.feature_depth >= 0.6
}

executive_signal := 4 if {
  input.telemetry
  input.telemetry.exec_meetings == 0
}

executive_signal := 1 if {
  input.telemetry
  input.telemetry.exec_meetings == 1
}

executive_signal := 0 if {
  input.telemetry.exec_meetings >= 2
}

executive_signal := 0 if {
  not input.telemetry
}

security_signal := 3 if {
  input.telemetry.security_review == "pending"
}

security_signal := 0 if {
  input.telemetry.security_review == "complete"
}

security_signal := 0 if {
  not input.telemetry
}

buying_committee_signal := 2 if {
  input.opportunity
  count(input.opportunity.buying_roles) < 2
}

buying_committee_signal := 0 if {
  input.opportunity
  count(input.opportunity.buying_roles) >= 2
}

buying_committee_signal := 0 if {
  not input.opportunity
}

procurement_signal := 2 if {
  input.opportunity
  input.opportunity.stage == "negotiation"
  not input.opportunity.stage_evidence["procurement_started"]
}

procurement_signal := 0 if {
  not input.opportunity
}

procurement_signal := 0 if {
  input.opportunity
  input.opportunity.stage != "negotiation"
}

################################################################################
# Actions & helpers
################################################################################

recommended_actions(violations, sla_breaches) := result if {
  auto_nudge := {"auto_nudge_owner" | violations[_] == "stale_deal"}
  auto_close := {"auto_close_pending" | violations[_] == "stage_aging_breach_negotiation"}
  manager_review := {"require_manager_review" | violations[_] == "discount_approval_missing"}
  block_routing := {"block_manual_routing" | violations[_] == "manual_routing_blocked"}
  refresh_fc := {"refresh_forecast" | count(forecast_violation) > 0}
  sla_page := {"sla_page_manager" | count(sla_breaches) > 0}
  rebalance := {"rebalance_round_robin" | violations[_] == "round_robin_out_of_order"}
  shed := {"shed_wip" | violations[_] == "wip_limit_exceeded"}
  enforce_cc1 := {"enforce_change_control" | violations[_] == "change_control_not_approved"}
  enforce_cc2 := {"enforce_change_control" | violations[_] == "change_control_missing"}
  result := auto_nudge | auto_close | manager_review | block_routing | refresh_fc | sla_page | rebalance | shed | enforce_cc1 | enforce_cc2
}

violation_flag_list(vs) := [violation | violation := vs[_]]

handoffs_complete(required, completed) if {
  missing := {p | some p in required; not p in completed}
  count(missing) == 0
}

approval_chain_for_discount(discount) := approvers if {
  thresholds := config.governance.quote_to_cash.approval_thresholds
  approvers := pick_approvers(discount, thresholds)
}

pick_approvers(discount, thresholds) := approvers if {
  candidates := [t | t := thresholds[_]; discount <= t.max_discount]
  count(candidates) > 0
  min_cap := min([c.max_discount | c := candidates[_]])
  some c in candidates
  c.max_discount == min_cap
  approvers := c.approvers
}

pick_approvers(discount, thresholds) := approvers if {
  candidates := [t | t := thresholds[_]]
  max_cap := max([c.max_discount | c := candidates[_]])
  discount > max_cap
  some c in candidates
  c.max_discount == max_cap
  approvers := c.approvers
}

approvals_superset(have, required) if {
  missing := {a | some a in required; not a in have}
  count(missing) == 0
}

# Check if expected is a prefix of actual (non-recursive implementation)
equal_prefix(expected, actual) if {
  not expected
}

equal_prefix(expected, actual) if {
  count(expected) <= count(actual)
  # All elements at each position must match
  mismatches := {i | some i, v in expected; actual[i] != v}
  count(mismatches) == 0
}

mandatory_field_present("buying_role") if {
  input.opportunity
  count(input.opportunity.buying_roles) > 0
}

mandatory_field_present(field) if {
  input.opportunity
  val := input.opportunity[field]
  val
  val != ""
}

mandatory_field_present(field) if {
  not input.opportunity
  field == ""
}

role_can_edit("revops", _) if { true }

role_can_edit("sdr", "lead") if { true }
role_can_edit("sdr", "contact") if { true }

role_can_edit("ae", "opportunity") if { true }

role_can_edit("manager", "opportunity") if { true }
role_can_edit("manager", "forecast") if { true }

role_can_edit("finance", "contract") if { true }
role_can_edit("finance", "concession") if { true }

role_can_edit("legal", "contract") if { true }

role_can_edit("cs", "handoff") if { true }
role_can_edit("cs", "renewal") if { true }
