package osint.provenance_test

test_deny_missing_artifacts if {
  denies := data.osint.provenance.deny with input as data.osint.fixtures.provenance_deny_missing_artifacts
  count(denies) > 0
}

test_deny_escalation_single_source if {
  denies := data.osint.provenance.deny with input as data.osint.fixtures.provenance_deny_escalation
  count(denies) > 0
}

test_allow_valid_provenance if {
  data.osint.provenance.allow with input as data.osint.fixtures.provenance_allow_valid
}
