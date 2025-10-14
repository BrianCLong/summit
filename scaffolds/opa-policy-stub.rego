package summit.policy.example

# Title: Dual Control Delete Policy
# Description: Require dual control and explicit reason for sensitive deletions

import input.reason
import input.approvers

default allow = false

allow {
  reason != ""
  count(approvers) >= 2
}

test_dual_control {
  allow with input as {"reason": "maintenance", "approvers": ["a","b"]}
}
