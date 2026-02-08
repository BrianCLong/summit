package osint.tos_test

test_deny_unregistered_source if {
  denies := data.osint.tos.deny with input as data.osint.fixtures.tos_deny_unregistered
  count(denies) > 0
}

test_deny_disallowed_method if {
  denies := data.osint.tos.deny with input as data.osint.fixtures.tos_deny_method
  count(denies) > 0
}

test_allow_valid_source if {
  data.osint.tos.allow with input as data.osint.fixtures.tos_allow_valid
}
