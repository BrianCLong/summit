package secops.autonomy

default allow = false

action_modes = {
  "read_advise": 0,
  "recommend_plan": 1,
  "act": 2
}

allow {
  input.mode == "read_advise"
}

allow {
  input.mode == "recommend_plan"
  count(input.evidenceIds) > 0
}

allow {
  input.mode == "act"
  input.approvals[_]
  input.scope == "containment"
  not high_impact_without_dual_control
}

high_impact_without_dual_control {
  input.impact == "critical"
  not input.approvals[1]
}
