package incident

import future.keywords

deny[msg] {
  input.severity == "critical"
  not "admin" in input.user.roles
  msg := "Only admins can manage critical incidents"
}
