package taint.rules
# Example taint rule: PII should not flow to untrusted sinks
deny[msg] {
  input.source.pii == true
  input.sink.trusted == false
  msg := "PII flowing to untrusted sink"
}