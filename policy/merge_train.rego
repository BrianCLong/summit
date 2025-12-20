package summit.merge_train

import future.keywords.if

default allow_override = false

allowed_roles := {"release-manager", "sre-oncall", "incident-commander", "change-manager"}

required_approvals := 2

# Collect reasons override cannot be granted
# Provides human-readable feedback in CI and CLI tooling

denies[msg] {
  not input.token
  msg := "missing override token"
}

denies[msg] {
  not input.token.id
  msg := "override token missing id"
}

denies[msg] {
  not input.token.reason
  msg := "override token missing reason"
}

denies[msg] {
  not input.token.scope
  msg := "override token missing scope"
}

denies[msg] {
  input.token.scope != "merge-train"
  msg := "override token scope must be 'merge-train'"
}

denies[msg] {
  not input.token.approved_by
  msg := "override token missing approvers"
}

denies[msg] {
  count(valid_approvers) < required_approvals
  msg := sprintf("requires at least %d approved roles", [required_approvals])
}

valid_approvers := [approver | approver := input.token.approved_by[_]; allowed_roles[approver]]


denies[msg] {
  not input.token.expires_at
  msg := "override token missing expires_at"
}

denies[msg] {
  time.parse_rfc3339_ns(input.token.expires_at) <= time.now_ns()
  msg := "override token expired"
}

denies[msg] {
  not input.reasons
  msg := "override requested with no active freeze window"
}

denies[msg] {
  count(input.reasons) == 0
  msg := "override requested with no active freeze window"
}

deny_after_hours[msg] {
  some reason
  reason := input.reasons[_]
  reason.type == "after-hours"
  not valid_after_hours_reason
  msg := "after-hours override requires explicit incident or release justification"
}

valid_after_hours_reason {
  contains(lower(input.token.reason), "incident")
}

valid_after_hours_reason {
  contains(lower(input.token.reason), "hotfix")
}

allow_override {
  count(denies) == 0
  count(deny_after_hours) == 0
}

denies_list := [d | d := denies[_]]
after_hours_denies := [d | d := deny_after_hours[_]]

result = {
  "allow_override": allow_override,
  "denies": array.concat(denies_list, after_hours_denies),
  "required_approvals": required_approvals,
}
