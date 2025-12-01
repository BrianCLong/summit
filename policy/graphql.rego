package intelgraph.graphql

default allow = false

# Allow if tenant matches and user has read permission
allow {
  input.user.tenantId == input.context.tenantId
  has_permission("read")
}

# Allow write if tenant matches and user has write permission
allow {
  is_mutation
  input.user.tenantId == input.context.tenantId
  has_permission("write")
}

# Admin override
allow {
  has_role("admin")
}

# Helpers
has_permission(perm) {
  # Check permissions if present
  input.user.permissions[_] == perm
}

has_permission(perm) {
  # Fallback to scope-based mapping for legacy support
  # scope format: "coherence:read", "coherence:write"
  # Mapping: "read" -> "coherence:read", "write" -> "coherence:write"
  input.user.scope[_] == sprintf("coherence:%s", [perm])
}

has_role(role) {
  input.user.role == role
}

is_mutation {
  startswith(input.action, "mutation.")
}

# Field-level security (example)
deny {
  input.resource.field == "socialSecurityNumber"
  not has_role("admin")
  not has_role("compliance_officer")
}
