package maestro.admission

# Stub function for admission decision
decision_for(req) := "require-human" {
  some label in req.policyLabels
  contains(label, "restricted")
}

decision_for(req) := "allow" {
  not decision_for_require_human(req)
}

decision_for_require_human(req) {
  some label in req.policyLabels
  contains(label, "restricted")
}

test_require_human_for_restricted {
  test_input := {"policyLabels": ["sensitivity:restricted"]}
  decision := decision_for(test_input)
  decision == "require-human"
}
