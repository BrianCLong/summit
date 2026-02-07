package summit.policy.simulation
import future.keywords.if
import future.keywords.contains

default decision := "deny"
default allow := false

bundle_version := input.bundle_version

allow_ingest_low_risk if {
  input.action == "ingest"
  input.risk < 0.7
}

allow_export_reviewed if {
  input.action == "export"
  input.flags.reviewed == true
  input.risk < 0.7
}

decision := "allow" if {
  allow
}

deny_reasons contains "high_risk_input" if {
  input.risk >= 0.7
}

deny_reasons contains "missing_signoff" if {
  input.action == "export"
  input.flags.reviewed == false
}

decision_trace contains entry if {
  entry := {
    "rule": "allow_ingest_low_risk",
    "outcome": "allow",
    "bundle_version": bundle_version,
    "signer_key_id": input.signer_key_id,
  }
  allow_ingest_low_risk
}

decision_trace contains entry if {
  entry := {
    "rule": "allow_export_reviewed",
    "outcome": "allow",
    "bundle_version": bundle_version,
    "signer_key_id": input.signer_key_id,
  }
  allow_export_reviewed
}

decision_trace contains entry if {
  entry := {
    "rule": "default_deny",
    "outcome": "deny",
    "bundle_version": bundle_version,
    "signer_key_id": input.signer_key_id,
  }
  not allow
}
