package kkp.authz

default allow = false

allow if {
  input.action == "issue_token"
  input.claims.sub != ""
  input.claims.aud != ""
}

allow if {
  input.action == "encrypt"
  input.request.backend != ""
  input.request.key_id != ""
}

allow if {
  input.action == "decrypt"
  input.claims.backend == input.request.envelope.backend
  input.claims.key_id == input.request.envelope.key_id
  context_matches
}

context_matches if {
  not input.claims.policy_claims.environment
}

context_matches if {
  input.claims.policy_claims.environment == input.request.context.environment
}
