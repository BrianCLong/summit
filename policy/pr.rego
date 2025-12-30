package summit.pr

import future.keywords.if
import future.keywords.contains

default allow_merge := false

allow_merge if {
  required_approvals
  required_status_checks
  required_labels
}

required_approvals if {
  input.pr.approvals >= 1
}

required_status_checks if {
  not failed_checks
}

failed_checks if {
  some c
  input.pr.checks[c].status == "failed"
}

required_labels if {
  some l
  input.pr.labels[l] == "governance-approved"
} else if {
  some l
  input.pr.labels[l] == "security-reviewed"
}
