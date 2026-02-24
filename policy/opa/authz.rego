package authz

import future.keywords.in

import future.keywords.if
import future.keywords.contains

default allow := false

allow if {
  input.user.authenticated
  input.action in allowed_actions[input.user.role]
  input.tenant == input.user.tenant
}

allowed_actions := {
  "viewer": {"read", "entityById", "searchEntities", "neighbors"},
  "analyst": {"read", "query", "export", "entityById", "searchEntities", "neighbors"},
  "admin": {"read", "query", "export", "write", "entityById", "searchEntities", "neighbors"}
}

violation_reason := reason if not allow
reason := {
  "message": "Access denied by policy.",
  "tenant": input.tenant,
  "role": input.user.role,
  "action": input.action
}
