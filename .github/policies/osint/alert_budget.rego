package osint.alert_budget

default allow = false

envelope_limits := {
  "conservative": 25,
  "balanced": 75,
  "max_legal": 150
}

deny["alert_budget_exceeded"] if {
  limit := envelope_limits[input.risk_envelope]
  input.collection.alert_count > limit
}

deny["unknown_envelope"] if {
  not envelope_limits[input.risk_envelope]
}

allow if {
  count(deny) == 0
}
