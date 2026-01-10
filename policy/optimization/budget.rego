package policy.optimization.budget

import future.keywords.if

default allow := false
default deny := {}

deny["insufficient_budget"] if {
  input.budget.available < input.cost
}

deny["loop_budget_exhausted"] if {
  input.budget.loop_remaining <= 0
}

deny["global_budget_exhausted"] if {
  input.budget.global_remaining <= 0
}

allow if {
  count(deny) == 0
}
