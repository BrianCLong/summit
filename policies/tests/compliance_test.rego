package compliance_test

import data.compliance as c

test_ccpa_dsr_pass {
  input := {
    "control_id": "ccpa-DSR-001",
    "now": "2025-12-26T00:00:00Z",
    "evidence": {
      "spec": "summit.evidence.dsr.v1",
      "ticket": {
        "opened_at": "2025-12-01T00:00:00Z",
        "status": "acknowledged",
        "ticket_id": "t1"
      },
      "event_type": "dsr.acknowledged",
      "occurred_at": "2025-12-02T00:00:00Z"
    }
  }
  c.allow with input as input
}

test_deploy_fail_missing_digest {
  input := {
    "control_id": "chg-DEPLOY-001",
    "now": "2025-12-26T00:00:00Z",
    "evidence": {
      "spec": "summit.evidence.deployment.v1",
      "event_type": "deploy.completed",
      "occurred_at": "2025-12-26T00:00:00Z",
      "deployment": {
        "deployment_id": "d1",
        "env": "prod",
        "service": "server",
        "commit_sha": "abc",
        "ci_run_id": "999",
        "artifact_digest": ""
      }
    }
  }
  not c.allow with input as input
}
