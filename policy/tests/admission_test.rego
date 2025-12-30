package maestro.admission

test_require_human_for_restricted if {
  input := {"policyLabels": ["sensitivity:restricted"]}
  decision := decision_for(input)
  decision == "require-human"
}

