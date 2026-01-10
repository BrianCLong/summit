package summit.governance.continuity_test

import rego.v1

allow := data.summit.governance.continuity.allow

default_input := {
  "request": {
    "non_purpose": false,
    "red_line": false,
    "approval": {"type": "governance", "quorum_met": true, "ticket_id": "GOV-42"}
  },
  "runtime": {
    "provenance_enabled": true,
    "policy_enforcement": "strict",
    "audit_sink": "immutable"
  },
  "metrics": {"semantic_delta": 0.0},
  "now": 1730000000
}

test_allow_valid_governance_change {
  allow with input as default_input
}

test_deny_non_purpose_change {
  not allow with input as default_input
    with input.request.non_purpose as true
}

test_deny_expired_waiver {
  not allow with input as default_input
    with input.request.waiver as {
      "expiry": 100,
      "owner": "custodian",
      "scope_subset": true
    }
}

test_allow_valid_waiver {
  allow with input as default_input
    with input.request.waiver as {
      "expiry": 1730000001,
      "owner": "custodian",
      "scope_subset": true
    }
}
