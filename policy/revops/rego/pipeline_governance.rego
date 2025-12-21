package revops.pipeline_governance

import future.keywords.in

stages := ["mql", "sql", "sao", "closed_won", "closed_lost", "closed_no_decision"]

required_fields := {
  "mql": ["lead_source.original", "owner.id"],
  "sql": ["problem_statement", "budget", "owner.id"],
  "sao": ["champion", "next_step", "close_date"],
  "closed_won": ["close_date", "contract_amount"],
  "closed_lost": ["close_reason.code", "close_reason.note"],
  "closed_no_decision": ["close_reason.code", "close_reason.note"],
}

critical_violations := {"stage_regression", "reason_code_missing", "territory_conflict"}

default decision = {
  "allowed": false,
  "reason": "not_evaluated",
  "violations": [],
  "required_fields_missing": [],
  "risk": {
    "score": 0,
    "signals": []
  },
  "metrics": {
    "coverage": 0,
    "velocity_days": 0,
    "conversion": {},
    "slippage": false
  },
  "handoffs": {
    "gaps": []
  },
  "flags": []
}

decision := out {
  opp := input.opportunity
  tenant_id := input.tenant.id

  violations := collect_violations(opp)
  missing := missing_fields(opp)

  risk_score := risk(opp)
  metrics := pipeline_metrics(input.pipeline)
  handoff_gaps := detect_handoff_gaps(opp.handoffs)

  allowed := not critical_violation_present(violations)

  reason := "ok" { allowed }
  reason := "critical_violation" { not allowed }

  out := {
    "allowed": allowed,
    "reason": reason,
    "violations": violations,
    "required_fields_missing": missing,
    "risk": risk_score,
    "metrics": metrics,
    "handoffs": {"gaps": handoff_gaps},
    "flags": dashboard_flags(violations, missing, metrics, opp, tenant_id)
  }
}

critical_violation_present(violations) {
  some v in violations
  v in critical_violations
}

missing_fields(opp) = missing {
  stage := lower(opp.stage)
  required := required_fields[stage]
  missing := [f | f := required[_]; not has_field(opp, f)]
}

missing_fields(opp) = [] {
  stage := lower(opp.stage)
  not required_fields[stage]
}

has_field(obj, path) {
  segments := split(path, ".")
  walk(obj, segments)
}

walk(val, [segment]) {
  val[segment]
}

walk(val, [segment, rest...]) {
  next := val[segment]
  walk(next, rest)
}

collect_violations(opp) = vs {
  stage_issue := stage_violation(opp)
  missing := missing_fields(opp)
  reason_issue := reason_code_violation(opp)
  source_issue := source_violation(opp)
  territory_issue := territory_violation(opp)
  renewal_issue := renewal_violation(opp)

  vs := [i | i := stage_issue; i != ""] ++
    [i | i := reason_issue; i != ""] ++
    ["required_fields_missing" { count(missing) > 0 }] ++
    ["source_attribution_missing" { source_issue }] ++
    ["territory_conflict" { territory_issue }] ++
    ["renewal_incomplete" { renewal_issue }]
}

stage_violation(opp) = "stage_regression" {
  not stage_progression_valid(opp.previous_stage, opp.stage)
}

stage_violation(_) = "" { true }

stage_progression_valid(prev, current) {
  not prev
}

stage_progression_valid(prev, current) {
  p_idx := index_of(stages, lower(prev))
  c_idx := index_of(stages, lower(current))
  p_idx <= c_idx
}

index_of(arr, val) = idx {
  arr[idx] == val
}

reason_code_violation(opp) = "reason_code_missing" {
  lower(opp.stage) in {"closed_lost", "closed_no_decision"}
  not has_field(opp, "close_reason.code")
}

reason_code_violation(_) = "" { true }

source_violation(opp) {
  not opp.lead_source.original
}

territory_violation(opp) {
  opp.owner.territory != opp.territory
}

renewal_violation(opp) {
  opp.type == "renewal"
  not opp.renewal
}

renewal_violation(opp) {
  opp.type == "renewal"
  not opp.renewal.renewal_date
}

risk(opp) = {
  "score": total,
  "signals": signals
} {
  signals := risk_signals(opp)
  total := risk_score(signals)
}

risk_signals(opp) = signals {
  last_activity := opp.activity.last_activity_at
  next_step := opp.activity.next_step
  champion := opp.activity.champion
  context_time := input.context.as_of
  stage_entered := opp.activity.stage_entered_at

  stale := ["stale_activity" | should_flag_stale(context_time, last_activity)]
  missing_champion := ["no_champion" | champion == ""]
  missing_next_step := ["no_next_step" | next_step == ""]
  stalled := ["stage_stalled" | should_flag_stage_stalled(context_time, stage_entered)]

  signals := array.concat(stale, array.concat(missing_champion, array.concat(missing_next_step, stalled)))
}

should_flag_stale(now, last_activity) {
  not last_activity
}

should_flag_stale(now, last_activity) {
  last := time.parse_rfc3339_as_nano(last_activity)
  current := time.parse_rfc3339_as_nano(now)
  days := time.diff(current, last, "day")
  days > 14
}

should_flag_stage_stalled(now, stage_entered) {
  not stage_entered
}

should_flag_stage_stalled(now, stage_entered) {
  entered := time.parse_rfc3339_as_nano(stage_entered)
  current := time.parse_rfc3339_as_nano(now)
  days := time.diff(current, entered, "day")
  days > 21
}

risk_score(signals) = total {
  weights := {"stale_activity": 40, "no_champion": 30, "no_next_step": 20, "stage_stalled": 15}
  total := sum([weights[s] | s := signals[_]])
}

pipeline_metrics(pipeline) = {
  "coverage": coverage,
  "velocity_days": velocity,
  "conversion": conversion,
  "slippage": slippage
} {
  coverage := compute_coverage(pipeline)
  velocity := compute_velocity_days(pipeline.stages)
  conversion := compute_conversion(pipeline.conversions)
  slippage := detect_slippage(pipeline.stages)
}

compute_coverage(pipeline) = coverage {
  quota := pipeline.quota
  coverage := 0 { quota == 0 }
  coverage := pipeline.total / quota { quota > 0 }
}

compute_velocity_days(stages_history) = velocity {
  count(stages_history) == 0
  velocity := 0
}

compute_velocity_days(stages_history) = velocity {
  first := stages_history[0].entered_at
  last := stages_history[count(stages_history)-1].entered_at
  velocity := time.diff(time.parse_rfc3339_as_nano(last), time.parse_rfc3339_as_nano(first), "day")
}

compute_conversion(conversions) = out {
  out := {name: rate(conversions[name]) | name := keys(conversions)[_]} { conversions }
}

compute_conversion(conversions) = {} {
  not conversions
}

rate(obj) = r {
  attempts := obj.attempts
  r := 0 { attempts == 0 }
  r := obj.wins / attempts { attempts > 0 }
}

detect_slippage(stages_history) {
  some s in stages_history
  lower(s.stage) == "closed_won"
  prev := stage_before(stages_history, s)
  prev
  lower(prev.stage) == "closed_lost"
}

stage_before(stages, current) = prev {
  idx := index_of_stage(stages, current)
  idx > 0
  prev := stages[idx-1]
}

index_of_stage(stages, current) = idx {
  stages[idx] == current
}

detect_handoff_gaps(handoffs) = gaps {
  gaps := [g |
    g := "missing_marketing_to_sales" { not handoffs.marketing_qualified_at }
    or g := "missing_sales_acceptance" { not handoffs.sales_accepted_at }
    or g := "missing_sales_to_cs" { not handoffs.sales_to_cs_at }
  ]
}

dashboard_flags(violations, missing, metrics, opp, tenant_id) = flags {
  flags := []
  flags := array.concat(flags, ["needs_data" | count(missing) > 0])
  flags := array.concat(flags, ["trustworthy_dashboard" | count(missing) == 0 and count(violations) == 0])
  flags := array.concat(flags, ["coverage_low" | metrics.coverage < 3])
  flags := array.concat(flags, ["expansion_candidate" | opp.type == "renewal" and opp.renewal and opp.renewal.expansion_triggered])
}

lower(v) = x {
  x := lower_ascii(v)
}
