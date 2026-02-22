package fcr.privacy

import future.keywords.in

default allow = false

allow {
  input.cost.epsilon <= input.budget.epsilon
  input.cost.delta <= input.budget.delta
}

budget_exhausted {
  input.cost.epsilon > input.budget.epsilon
}
