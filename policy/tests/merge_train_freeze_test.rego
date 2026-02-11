import future.keywords.in
package summit.merge_train_test

import data.summit.merge_train
import future.keywords.if
import future.keywords.contains

valid_token := {
  "id": "freeze-override-123",
  "scope": "merge-train",
  "reason": "incident hotfix",
  "approved_by": ["release-manager", "sre-oncall"],
  "expires_at": "2099-12-31T23:59:59Z",
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

test_allows_valid_token_during_holiday if {
  decision := merge_train.result with input as {
    "token": valid_token,
    "reasons": winter_window,
    "now": "2025-12-20T10:00:00Z",
  }
  decision.allow_override
  count(decision.denies) == 0
}

test_denies_missing_token if {
  decision := merge_train.result with input as {
    "reasons": winter_window,
    "now": "2025-12-20T10:00:00Z",
  }
  not decision.allow_override
  some msg
  decision.denies[msg] == "missing override token"
}

test_denies_unapproved_role if {
  bad_token := object.union(valid_token, {"approved_by": ["random"]})

  decision := merge_train.result with input as {
    "token": bad_token,
    "reasons": winter_window,
    "now": "2025-12-20T10:00:00Z",
  }

  not decision.allow_override
}

test_requires_incident_for_after_hours if {
  maintenance_token := object.union(valid_token, {"reason": "maintenance"})

  decision := merge_train.result with input as {
    "token": maintenance_token,
    "reasons": array.concat(weekend_window, [{"type": "after-hours", "name": "After hours"}]),
    "now": "2025-12-20T03:00:00Z",
  }
  not decision.allow_override
  some msg
  decision.denies[msg] == "after-hours override requires explicit incident or release justification"
}
