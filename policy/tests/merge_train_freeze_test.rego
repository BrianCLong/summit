package summit.merge_train_test

import data.summit.merge_train

valid_token := {
  "id": "freeze-override-123",
  "scope": "merge-train",
  "reason": "incident hotfix", 
  "approved_by": ["release-manager", "sre-oncall"],
  "expires_at": time.now_ns() + 60000000000,
}

winter_window := [{
  "type": "holiday",
  "name": "Winter shutdown",
  "window": {
    "from": "2025-12-15T00:00:00Z",
    "to": "2026-01-05T00:00:00Z",
  },
}]

weekend_window := [{
  "type": "weekend",
  "name": "Weekend freeze",
}]

test_allows_valid_token_during_holiday {
  decision := merge_train.result with input as {
    "token": valid_token,
    "reasons": winter_window,
    "now": "2025-12-20T10:00:00Z",
  }
  decision.allow_override
  count(decision.denies) == 0
}

test_denies_missing_token {
  decision := merge_train.result with input as {
    "reasons": winter_window,
    "now": "2025-12-20T10:00:00Z",
  }
  not decision.allow_override
  some msg
  decision.denies[msg] == "missing override token"
}

test_denies_unapproved_role {
  bad_token := {
    "id": valid_token.id,
    "scope": valid_token.scope,
    "reason": valid_token.reason,
    "approved_by": ["random"],
    "expires_at": valid_token.expires_at,
  }

  decision := merge_train.result with input as {
    "token": bad_token,
    "reasons": winter_window,
    "now": "2025-12-20T10:00:00Z",
  }

  not decision.allow_override
}

test_requires_incident_for_after_hours {
  maintenance_token := {
    "id": valid_token.id,
    "scope": valid_token.scope,
    "reason": "maintenance",
    "approved_by": valid_token.approved_by,
    "expires_at": valid_token.expires_at,
  }
  decision := merge_train.result with input as {
    "token": maintenance_token,
    "reasons": weekend_window ++ [{"type": "after-hours", "name": "After hours"}],
    "now": "2025-12-20T03:00:00Z",
  }
  not decision.allow_override
  some msg
  decision.denies[msg] == "after-hours override requires explicit incident or release justification"
}
