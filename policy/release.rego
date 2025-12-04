package summit.release

default allow = false

# A release is permitted when canary safeguards are satisfied and rollback is ready.
allow {
  input.environment == "stage"
  valid_canary_plan
  rollback_ready
}

allow {
  input.environment == "prod"
  valid_canary_plan
  rollback_ready
  slo_guardrails
}

valid_canary_plan {
  input.canary.plan_approved == true
  input.canary.metrics.p95_latency_ms <= input.canary.budget.p95_latency_ms
  input.canary.metrics.error_budget_remaining > 0
  input.canary.ramp == [5, 20, 50, 100]
}

rollback_ready {
  input.rollback.helm_release != ""
  input.rollback.feature_flags_revert == true
  input.rollback.exercise == "complete"
}

slo_guardrails {
  input.slo.latency_budget_ms <= 1500
  input.slo.error_budget_burn_rate <= 2
}
