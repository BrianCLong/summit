package compliance

pass["sec-AUTHZ-001"]["Authz event contains decision, actor, resource"] {
  input.evidence.spec == "summit.evidence.authz.v1"
  d := input.evidence.decision
  d == "allow" or d == "deny"
  input.evidence.actor.id != ""
  input.evidence.resource.id != ""
}

fail["sec-AUTHZ-001"]["Missing authz fields"] {
  input.evidence.spec == "summit.evidence.authz.v1"
  not input.evidence.actor.id
} else {
  input.evidence.spec == "summit.evidence.authz.v1"
  not input.evidence.resource.id
} else {
  input.evidence.spec == "summit.evidence.authz.v1"
  not input.evidence.decision
}
