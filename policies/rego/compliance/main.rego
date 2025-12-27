package compliance

default allow = false

# allow is true only for PASS.
allow {
  decision.result == "PASS"
}

decision := {
  "control_id": control_id,
  "result": result,
  "reasons": reasons,
} {
  control_id := input.control_id
  result := "PASS"
  reasons := [r | pass[control_id][r]]
  count(reasons) > 0
} else := {
  "control_id": control_id,
  "result": result,
  "reasons": reasons,
} {
  control_id := input.control_id
  result := "FAIL"
  reasons := [r | fail[control_id][r]]
  count(reasons) > 0
} else := {
  "control_id": control_id,
  "result": "UNKNOWN",
  "reasons": reasons,
} {
  control_id := input.control_id
  reasons := unknown_reasons(control_id)
}

unknown_reasons(control_id) := reasons {
  not input.evidence
  reasons := ["Missing evidence: input.evidence is absent"]
} else := reasons {
  input.evidence
  count([r | pass[control_id][r]]) == 0
  count([r | fail[control_id][r]]) == 0
  reasons := ["Insufficient evidence: no pass/fail rule matched for this control"]
}
