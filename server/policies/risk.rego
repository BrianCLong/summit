package intelgraph.risk

import future.keywords

default allow_auto = false

deny[msg] {
  input.action == "auto_remediate"
  input.context.source == "risk"
  msg := "auto_remediation_denied_by_policy"
}
