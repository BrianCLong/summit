package router.guard

default allow = true

deny[msg] {
  input.estimated_cost_usd > input.budget_per_brief_usd
  msg := sprintf("cost %.4f exceeds per-brief budget %.4f", [input.estimated_cost_usd, input.budget_per_brief_usd])
}

deny[msg] {
  input.contains_sensitive
  not input.reason
  msg := "missing reason for access on sensitive request"
}

allow {
  count(deny) == 0
}
