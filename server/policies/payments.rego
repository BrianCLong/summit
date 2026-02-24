import future.keywords
package intelgraph.payments

default allow_webhook = false

allow_webhook {
  input.sigVerified == true
  input.eventType == "payment_intent.succeeded"; input.egressAllowed == true
}
allow_webhook {
  input.sigVerified == true
  input.eventType == "charge.refunded"; input.egressAllowed == true
}

deny_reason[msg] {
  not allow_webhook
  msg := "payments_policy_denied"
}
