package summit.policy.simulation

default decision := "deny"
default allow := false

bundle_version := input.bundle_version

allow if_ingest_low_risk {
  input.action == "ingest"
  input.risk < 0.7
}

allow if_export_reviewed {
  input.action == "export"
  input.flags.reviewed == true
  input.risk < 0.7
}

decision := "allow" {
  allow
}

deny_reasons["high_risk_input"] {
  input.risk >= 0.7
}

deny_reasons["missing_signoff"] {
  input.action == "export"
  input.flags.reviewed == false
}

decision_trace[entry] {
  entry := {
    "rule": "allow_ingest_low_risk",
    "outcome": "allow",
    "bundle_version": bundle_version,
    "signer_key_id": input.signer_key_id,
  }
  allow if_ingest_low_risk
}

decision_trace[entry] {
  entry := {
    "rule": "allow_export_reviewed",
    "outcome": "allow",
    "bundle_version": bundle_version,
    "signer_key_id": input.signer_key_id,
  }
  allow if_export_reviewed
}

decision_trace[entry] {
  entry := {
    "rule": "default_deny",
    "outcome": "deny",
    "bundle_version": bundle_version,
    "signer_key_id": input.signer_key_id,
  }
  not allow
}
