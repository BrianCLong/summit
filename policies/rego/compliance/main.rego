package compliance

default allow = false

allow {
  ctrl := input.control_id
  some reason
  pass[ctrl][reason]
}

decision := {
  "control_id": input.control_id,
  "result": result,
  "reasons": reasons
} {
  reasons := [r | pass[input.control_id][r]]
  count(reasons) > 0
  result := "PASS"
} else := {
  "control_id": input.control_id,
  "result": "FAIL",
  "reasons": reasons
} {
  reasons := [r | fail[input.control_id][r]]
  result := "FAIL"
}
