package osint.alert_budget_test

test_deny_alert_budget_exceeded if {
  denies := data.osint.alert_budget.deny with input as data.osint.fixtures.alert_deny_exceeded
  count(denies) > 0
}

test_deny_unknown_envelope if {
  denies := data.osint.alert_budget.deny with input as data.osint.fixtures.alert_deny_unknown_envelope
  count(denies) > 0
}

test_allow_alert_budget_valid if {
  data.osint.alert_budget.allow with input as data.osint.fixtures.alert_allow_valid
}
