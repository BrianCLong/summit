package gh.preflight

default allow := false

approved := {sprintf("%s@%s", [a.name, a.sha]) |
  some i
  a := input.allowlist.approved_actions[i]
}

violation[msg] {
  ref := input.refs[_]
  not startswith(ref, "local/")
  not approved[ref]
  msg := sprintf("Non-allowlisted or unpinned action detected: %s", [ref])
}

allow {
  count([r | violation(r)]) == 0
}
