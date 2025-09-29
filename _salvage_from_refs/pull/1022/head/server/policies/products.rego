package intelgraph.products

default allow_run = false

allow_run {
  input.entitlement.scopes[_] == input.request.template
  input.entitlement.epsilonRemaining >= input.request.epsilon
  time.now_ns() < input.entitlement.expiresAt * 1000000
}

deny_reason[msg] {
  not allow_run
  msg := "entitlement_policy_denied"
}
