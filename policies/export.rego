package export

import future.keywords

deny[msg] {
  input.sensitivity == "high"
  not input.user.has_step_up
  msg := "Step-up authentication required"
}
