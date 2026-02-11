import future.keywords.in
import future.keywords.if
package intelgraph.export

import future.keywords.every

test_simulate_allows_without_step_up {
  input := {
    "mode": "simulate",
    "action": "export",
    "auth": {"webauthn_verified": false},
    "resource": {
      "sensitivity": "Sensitive",
      "fields": [
        {"path": "person.ssn", "tags": ["pii:ssn"]},
        {"path": "email", "tags": ["pii:email"]}
      ],
      "explicit_dlp_mask_paths": ["credit_card.number"]
    }
  }
  data.intelgraph.export.allow with input as input
  d := data.intelgraph.export.decision with input as input
  d.step_up.required == true
  d.step_up.satisfied == false
  count(d.redactions) == 3
}

test_enforce_denies_without_step_up_when_sensitive {
  input := {
    "mode": "enforce",
    "action": "export",
    "auth": {"webauthn_verified": false},
    "resource": {
      "sensitivity": "Restricted",
      "fields": [{"path": "person.ssn", "tags": ["pii:ssn"]}],
      "explicit_dlp_mask_paths": []
    }
  }
  not data.intelgraph.export.allow with input as input
  d := data.intelgraph.export.decision with input as input
  d.step_up.required
  not d.step_up.satisfied
}

test_enforce_allows_with_step_up {
  input := {
    "mode": "enforce",
    "action": "export",
    "auth": {"webauthn_verified": true},
    "resource": {
      "sensitivity": "Sensitive",
      "fields": [],
      "explicit_dlp_mask_paths": []
    }
  }
  data.intelgraph.export.allow with input as input
}

test_redactions_merge_tags_and_explicit {
  input := {
    "mode": "simulate",
    "action": "export",
    "auth": {"webauthn_verified": true},
    "resource": {
      "sensitivity": "Internal",
      "fields": [
        {"path": "email", "tags": ["pii:email"]},
        {"path": "notes", "tags": []}
      ],
      "explicit_dlp_mask_paths": ["notes.secret"]
    }
  }
  d := data.intelgraph.export.decision with input as input
  some r in d.redactions; r.path == "email"
  some s in d.redactions; s.path == "notes.secret"
}

