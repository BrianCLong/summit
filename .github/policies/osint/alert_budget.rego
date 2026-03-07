package osint.alert_budget

default allow = false

deny["unknown_envelope"] if {
  not input.risk_envelopes[input.risk_envelope]
}

deny["alert_budget_exceeded"] if {
  envelope := input.risk_envelopes[input.risk_envelope]
  input.collection.alert_count > envelope.max_alerts_per_run
}

allow if {
  count(deny) == 0
}
