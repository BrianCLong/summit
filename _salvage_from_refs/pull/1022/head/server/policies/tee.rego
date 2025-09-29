package intelgraph.tee

default allow = false

allow {
  input.attestation.ok == true
  input.policy.type == input.attestation.claims.type
  not input.flags.debug_no_attest
}

deny_reason[msg] {
  not allow
  msg := "tee_attestation_required"
}
