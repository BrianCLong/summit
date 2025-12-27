package compliance_unknown_test

import data.compliance as c

test_unknown_when_evidence_missing {
  input := {
    "control_id": "sec-AUTHZ-001",
    "now": "2025-12-26T00:00:00Z"
  }

  d := c.decision with input as input
  d.result == "UNKNOWN"
  not c.allow with input as input
}

test_unknown_when_no_match {
  input := {
    "control_id": "sec-AUTHZ-001",
    "now": "2025-12-26T00:00:00Z",
    "evidence": {
      "spec": "summit.evidence.dsr.v1",
      "control_id": "sec-AUTHZ-001",
      "event_type": "dsr.opened",
      "occurred_at": "2025-12-26T00:00:00Z",
      "ticket": {
        "ticket_id": "t1",
        "opened_at": "2025-12-26T00:00:00Z",
        "status": "opened"
      }
    }
  }

  d := c.decision with input as input
  d.result == "UNKNOWN"
  not c.allow with input as input
}
