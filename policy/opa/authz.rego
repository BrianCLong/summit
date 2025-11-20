package authz

default allow = false

allow {
  input.user.authenticated
  input.action in allowed_actions[input.user.role]
  input.tenant == input.user.tenant
}

allowed_actions := {
  "viewer": {"read:logs", "read:metrics"},
  "analyst": {"read:logs", "read:metrics", "query:logs", "export:csv"},
  "admin": {
    "read:logs",
    "read:metrics",
    "query:logs",
    "export:csv",
    "write:users",
    "write:roles"
  }
}

violation_reason := reason if not allow
reason = {
  "message": "Access denied by policy.",
  "tenant": input.tenant,
  "role": input.user.role,
  "action": input.action
}
