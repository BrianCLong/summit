package summit.graduation

valid_states := {
  "Experimental",
  "GA-Adjacent",
  "GA",
}

promotion_intents := {
  "None",
  "Experimental → GA-Adjacent",
  "GA-Adjacent → GA",
}

violations[msg] {
  state := input.graduation.frontend_state
  not valid_states[state]
  msg := "Frontend lifecycle state missing or invalid."
}

violations[msg] {
  state := input.graduation.backend_state
  not valid_states[state]
  msg := "Backend lifecycle state missing or invalid."
}

violations[msg] {
  valid_states[input.graduation.frontend_state]
  valid_states[input.graduation.backend_state]
  input.graduation.frontend_state != input.graduation.backend_state
  msg := "Frontend and backend lifecycle states must match."
}

violations[msg] {
  intent := input.graduation.promotion_intent
  not promotion_intents[intent]
  msg := "Promotion intent missing or invalid."
}

violations[msg] {
  input.graduation.promotion_intent != "None"
  input.graduation.evidence == ""
  msg := "Evidence bundle required for promotion intent."
}

violations[msg] {
  input.graduation.promotion_intent != "None"
  input.graduation.joint_approval != "Approved"
  msg := "Joint approval required for promotion intent."
}

decision := {
  "allowed": count(violations) == 0,
  "violations": violations,
}
