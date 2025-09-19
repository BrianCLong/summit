package export

import data.export

test_deny_without_permission {
  input := {
    "user": {"permissions": [], "roles": ["exporter"]},
    "bundle": {"sensitivity": "Public", "fields": []},
    "options": {"dlp_mask_fields": []},
    "webauthn_verified": false,
    "simulate": false
  }
  decision := data.export.decision with input as input
  decision.effect == "deny"
  decision.reasons[_] == "not_authorized"
}

test_step_up_for_sensitive_without_webauthn {
  input := {
    "user": {"permissions": ["export"], "roles": ["exporter"]},
    "bundle": {"sensitivity": "Sensitive", "fields": []},
    "options": {"dlp_mask_fields": []},
    "webauthn_verified": false,
    "simulate": false
  }
  decision := data.export.decision with input as input
  decision.effect == "step_up"
}

test_allow_with_redactions_for_pii {
  input := {
    "user": {"permissions": ["export"], "roles": ["exporter"]},
    "bundle": {"sensitivity": "Internal", "fields": [{"name": "email", "labels": ["pii:email"]}]},
    "options": {"dlp_mask_fields": []},
    "webauthn_verified": true,
    "simulate": false
  }
  decision := data.export.decision with input as input
  decision.effect == "allow_with_redactions"
  count(decision.redact_fields) == 1
}

test_simulate_sets_flag {
  input := {
    "user": {"permissions": ["export"], "roles": ["exporter"]},
    "bundle": {"sensitivity": "Public", "fields": []},
    "options": {"dlp_mask_fields": []},
    "webauthn_verified": false,
    "simulate": true
  }
  decision := data.export.decision with input as input
  decision.simulated == true
}
