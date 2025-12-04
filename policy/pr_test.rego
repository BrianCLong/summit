package summit.pr

import data.summit.pr

test_pr_allows_good_state {
  pr.allow_merge with input as {
    "pr": {
      "approvals": 1,
      "labels": ["governance-approved"],
      "checks": [
        {"name": "ci-golden-path", "status": "success"},
        {"name": "governance", "status": "success"}
      ]
    }
  }
}
