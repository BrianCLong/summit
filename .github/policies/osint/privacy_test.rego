package osint.privacy_test

test_deny_missing_redaction if {
  denies := data.osint.privacy.deny with input as data.osint.fixtures.privacy_deny_pii
  count(denies) > 0
}

test_deny_invalid_retention if {
  denies := data.osint.privacy.deny with input as data.osint.fixtures.privacy_deny_retention
  count(denies) > 0
}

test_allow_valid_redaction if {
  data.osint.privacy.allow with input as data.osint.fixtures.privacy_allow_valid
}
