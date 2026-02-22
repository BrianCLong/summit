package summit.narrative.authz

default allow := false

deny[msg] {
  input.intervention.channel == "external_publish"
  not input.intervention.human_approval
  msg := "external publishing requires explicit human approval"
}

allow {
  not deny[_]
  input.intervention.simulate_only == true
}
