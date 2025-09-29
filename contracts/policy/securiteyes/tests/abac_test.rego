package securiteyes.abac

test_owner_merge_allowed if {
  allow with input as {
    "subject": {"roles": ["owner"], "mfa": true},
    "action": "merge_pr",
    "resource": {
      "repo": {"labels": []},
      "merge": {"provenance_verified": true},
      "freeze_window": {"active": false}
    },
    "environment": "staging"
  }
}

test_freeze_denied if {
  deny[msg] with input as {
    "subject": {"roles": ["maintainer"], "mfa": true},
    "action": "deploy",
    "resource": {
      "repo": {"labels": []},
      "merge": {"provenance_verified": true},
      "freeze_window": {"active": true}
    },
    "environment": "production"
  }
  msg == "deploy blocked: freeze window"
}
