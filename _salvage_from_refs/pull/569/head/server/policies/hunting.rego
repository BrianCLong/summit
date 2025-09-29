package hunting

deny[msg] {
  input.action == "write"
  msg = "writes_not_allowed"
}

deny[msg] {
  input.action == "promote"
  not input.roles[_] == "Reviewer"
  msg = "reviewer_required"
}
