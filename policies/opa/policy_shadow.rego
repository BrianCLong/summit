package opa.policy_shadow

import future.keywords

deny[msg] {
  some dec in input.decisions
  dec == "deny"
  msg := "Shadow policy denial"
}
