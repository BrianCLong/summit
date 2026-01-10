package intelgraph.policy.contracting

test_allow_releasability_pack if {
  obj := {
    "action": "releasability_pack",
    "now": 200,
    "scope": {
      "classification": "CUI",
      "token": {
        "tenant": "intelgraph",
        "purpose": "release",
        "expiration": 300
      }
    },
    "egress": {
      "bytes": 500,
      "budget_bytes": 1000,
      "entities": 20,
      "entity_budget": 50
    },
    "attestation": {
      "required": true,
      "present": true
    },
    "sbom": {
      "required": false,
      "present": false,
      "licenses_ok": false
    },
    "incident": {
      "triggered": false,
      "reporting_window_hours": 0,
      "preservation_complete": false
    },
    "evidence": {
      "sufficiency": true,
      "control_ids": ["3.1.1"]
    }
  }

  allow with input as obj
  count(deny with input as obj) == 0
}

test_deny_expired_scope_token if {
  obj := {
    "action": "releasability_pack",
    "now": 200,
    "scope": {
      "classification": "CUI",
      "token": {
        "tenant": "intelgraph",
        "purpose": "release",
        "expiration": 100
      }
    },
    "egress": {
      "bytes": 100,
      "budget_bytes": 1000,
      "entities": 10,
      "entity_budget": 50
    },
    "attestation": {
      "required": true,
      "present": true
    },
    "sbom": {
      "required": false,
      "present": false,
      "licenses_ok": false
    },
    "incident": {
      "triggered": false,
      "reporting_window_hours": 0,
      "preservation_complete": false
    },
    "evidence": {
      "sufficiency": true,
      "control_ids": ["3.1.1"]
    }
  }

  not allow with input as obj
  deny["invalid_scope_token"] with input as obj
}

test_deny_incident_reporting_window if {
  obj := {
    "action": "incident_packet",
    "now": 200,
    "scope": {
      "classification": "CUI",
      "token": {
        "tenant": "intelgraph",
        "purpose": "incident",
        "expiration": 300
      }
    },
    "egress": {
      "bytes": 0,
      "budget_bytes": 1000,
      "entities": 0,
      "entity_budget": 50
    },
    "attestation": {
      "required": false,
      "present": false
    },
    "sbom": {
      "required": false,
      "present": false,
      "licenses_ok": false
    },
    "incident": {
      "triggered": true,
      "reporting_window_hours": 96,
      "preservation_complete": true
    },
    "evidence": {
      "sufficiency": true,
      "control_ids": ["3.1.1"]
    }
  }

  not allow with input as obj
  deny["incident_reporting_window_exceeded"] with input as obj
}
