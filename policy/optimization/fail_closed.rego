package policy.optimization.fail_closed

import future.keywords.if

default deny := false

missing_required_signals := {signal |
  signal := input.required_signals[_]
  not input.signals[signal]
}

deny if {
  count(missing_required_signals) > 0
}

deny if {
  input.loop_id == ""
}

deny if {
  input.action == ""
}

deny if {
  input.mode == ""
}
