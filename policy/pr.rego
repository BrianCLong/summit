package summit.pr

default allow_merge = false

allow_merge {
  required_approvals
  required_status_checks
  required_labels
}

required_approvals {
  input.pr.approvals >= 1
}

required_status_checks {
  not failed_checks
}

failed_checks {
  some c
  input.pr.checks[c].status == "failed"
}

required_labels {
  some l
  input.pr.labels[l] == "governance-approved"
} else {
  some l
  input.pr.labels[l] == "security-reviewed"
}
