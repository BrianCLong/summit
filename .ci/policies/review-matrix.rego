package review.matrix

import future.keywords
import future.keywords.in

default allow = false

critical_paths = ["deploy/", ".security/", ".maestro/", ".ci/", "migrations/"]

required_labels[f] {
  f := input.pull_request.changed_files[_]
  startswith(f, "migrations/")
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
  some lbl in input.pull_request.labels
  lower(lbl) == "wip"
}

_min_approvals := 2 {
  _touches_critical
}

_min_approvals := 1 {
  not _touches_critical
}

approvals_ok {
  input.pull_request.owner_approvals >= _min_approvals
  not self_approval
}

self_approval {
  input.pull_request.author in input.pull_request.approvers
}

_touches_critical {
  some f in input.pull_request.changed_files
  some p in critical_paths
  startswith(f, p)
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
