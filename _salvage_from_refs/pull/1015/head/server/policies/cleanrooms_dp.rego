package intelgraph.cleanrooms.dp

default allow = false

allow {
  input.manifest.piiOff == true
  input.ctx.persisted == true
  input.manifest.kMin <= input.query.cohortSize
  input.accountant.spent + input.query.epsilon <= input.manifest.epsilonCap
}

deny_reason[msg] {
  not allow
  msg := "dp_policy_denied"
}
