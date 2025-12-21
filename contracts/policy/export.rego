package export.authz

default allow = false

allow {
  input.user.roles[_] == "DisclosureApprover"
  not deny_reason[_]
}

deny_reason[msg] {
  input.dataset.license == "restricted"
  msg := "Export blocked by license"
}
