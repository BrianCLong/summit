package conductor.authz

import future.keywords.if

default allow := false

# Require explicit scope for sensitive ops
allow if {
  input.user.scopes[_] == "graph:write"
  input.action == "conduct"
  not blocks_pii(input)
}

# Block if PII detected and user lacks pii:handle
blocks_pii(req) if {
  req.context.sensitivity == "pii"
  not user_can_handle_pii
}
user_can_handle_pii if {
  input.user.scopes[_] == "pii:handle"
}

# Require reason-for-access on sensitive queries
allow if {
  input.action == "conduct"
  input.context.sensitivity == "pii"
  input.context.reason_for_access != ""
  input.user.scopes[_] == "pii:handle"
}
