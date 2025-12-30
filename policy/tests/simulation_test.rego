package summit.policy.simulation_test

import data.summit.policy.simulation
import future.keywords.if

test_ingest_allowed_low_risk if {
  simulation.decision with input as {
    "action": "ingest",
    "risk": 0.3,
    "bundle_version": "2025.12.03",
    "signer_key_id": "opa-signer-dev",
    "flags": {
      "reviewed": true
    }
  }
  simulation.decision_trace[_].rule == "allow_ingest_low_risk"
}

test_export_requires_review if {
  simulation.decision == "deny" with input as {
    "action": "export",
    "risk": 0.2,
    "bundle_version": "2025.12.03",
    "signer_key_id": "opa-signer-dev",
    "flags": {
      "reviewed": false
    }
  }
  simulation.deny_reasons["missing_signoff"] with input as {
    "action": "export",
    "risk": 0.2,
    "bundle_version": "2025.12.03",
    "signer_key_id": "opa-signer-dev",
    "flags": {
      "reviewed": false
    }
  }
}

test_high_risk_denied if {
  simulation.decision == "deny" with input as {
    "action": "ingest",
    "risk": 0.9,
    "bundle_version": "2025.12.03",
    "signer_key_id": "opa-signer-dev",
    "flags": {
      "reviewed": true
    }
  }
  simulation.deny_reasons["high_risk_input"] with input as {
    "action": "ingest",
    "risk": 0.9,
    "bundle_version": "2025.12.03",
    "signer_key_id": "opa-signer-dev",
    "flags": {
      "reviewed": true
    }
  }
  simulation.decision_trace[_].outcome == "deny"
}
