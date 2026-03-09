package ai_stack

default allow = false

allow {
  input.feature_flags.ai_stack_enabled == true
  input.action in {"benchmark", "experiment", "open_draft_pr"}
  not input.high_risk
}
