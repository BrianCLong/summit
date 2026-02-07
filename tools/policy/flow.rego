import future.keywords
package repo.flow

deny[msg] {
  input.flow.lints[_].level == "error"
  msg := "FlowLint errors present; fix flow"
}

deny[msg] {
  input.pr.fail_prob >= 0.3
  msg := sprintf("High predicted failure probability: %.2f", [input.pr.fail_prob])
}