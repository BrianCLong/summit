import future.keywords
package repo.policy

default allow = false

# Large PRs need waiver
allow {
  input.pr.additions + input.pr.deletions < 2500
}

allow {
  input.pr.labels[_] == "risk:waived"
}

# Changes to Helm/workflows require owners
deny[msg] {
  some f
  f := input.pr.changed_files[_]
  startswith(f, "charts/") or startswith(f, ".github/workflows/")
  not input.pr.labels[_] == "owners:approved"
  msg := sprintf("owners approval missing for %s", [f])
}