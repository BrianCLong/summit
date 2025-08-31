package conductor.authz

default allow = false

# Require explicit scope for sensitive ops
allow {
  input.user.scopes[_] == "graph:write"
  input.action == "conduct"
  not blocks_pii(input)
}

# Block if PII detected and user lacks pii:handle
blocks_pii(input) {
  input.context.sensitivity == "pii"
  not user_can_handle_pii
}
user_can_handle_pii {
  input.user.scopes[_] == "pii:handle"
}

# Require reason-for-access on sensitive queries
allow {
  input.action == "conduct"
  input.context.sensitivity == "pii"
  input.context.reason_for_access != ""
  input.user.scopes[_] == "pii:handle"
}