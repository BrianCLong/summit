package taint.rules

import future.keywords.contains
import future.keywords.if
# Example taint rule: PII should not flow to untrusted sinks
deny contains msg if {
  input.source.pii == true
  input.sink.trusted == false
  msg := "PII flowing to untrusted sink"
}
