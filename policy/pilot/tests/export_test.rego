package policy.pilot.tests

import data.policy.export

safe_input := {
  "iam": {"wildcard_actions": false},
  "k8s": {"privileged_pod": false}
}

wildcard_input := {
  "iam": {"wildcard_actions": true},
  "k8s": {"privileged_pod": false}
}

privileged_input := {
  "iam": {"wildcard_actions": false},
  "k8s": {"privileged_pod": true}
}

test_allow_when_no_denies {
  export.deny with input as safe_input == []
}

test_deny_on_wildcard {
  msgs := export.deny with input as wildcard_input
  msgs == ["Deny wildcard IAM actions"]
}

test_deny_on_privileged_pod {
  msgs := export.deny with input as privileged_input
  msgs == ["Deny privileged pods"]
}
