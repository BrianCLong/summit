import future.keywords
package review.matrix

default allow = false

critical_paths = ["deploy/", ".security/", ".maestro/", ".ci/", "migrations/"]

required_labels[file] {
  startswith(file, "migrations/")
  result := "needs-migration-gate"
}

# Evaluate approval requirements per path
allow {
  input.pull_request.title_matches
  not disallow_wip
  approvals_ok
  labels_ok
}

disallow_wip {
  some l
  l := lower(input.pull_request.labels[_])
  l == "wip"
}

approvals_ok {
  critical := count({f | f := input.pull_request.changed_files[_]; startswith(f, p) | p := critical_paths[_]}) > 0
  required := cond(critical, 2, 1)
  input.pull_request.owner_approvals >= required
  not self_approval
}

self_approval {
  input.pull_request.author in input.pull_request.approvers
}

labels_ok {
  migrations := {f | f := input.pull_request.changed_files[_]; startswith(f, "migrations/")}
  count(migrations) == 0
}
labels_ok {
  migrations := {f | f := input.pull_request.changed_files[_]; startswith(f, "migrations/")}
  count(migrations) > 0
  "needs-migration-gate" in input.pull_request.labels
  input.pull_request.checks["migration-gate"] == "passed"
}
