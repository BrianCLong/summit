package intelgraph.graphql

default allow := false

# Allow if tenant matches and user has read permission
allow if {
  input.user.tenantId == input.context.tenantId
  has_permission("read")
}

# Allow write if tenant matches and user has write permission
allow if {
  is_mutation
  input.user.tenantId == input.context.tenantId
  has_permission("write")
}

# Admin override
allow if {
  has_role("admin")
}

# Helpers
has_permission(perm) if {
  # Check permissions if present
  input.user.permissions[_] == perm
}

has_permission(perm) if {
  # Fallback to scope-based mapping for legacy support
  # scope format: "coherence:read", "coherence:write"
  # Mapping: "read" -> "coherence:read", "write" -> "coherence:write"
  input.user.scope[_] == sprintf("coherence:%s", [perm])
}

has_role(role) if {
  input.user.role == role
}

is_mutation if {
  startswith(input.action, "mutation.")
}

# Field-level security (example)
deny if {
  input.resource.field == "socialSecurityNumber"
  not has_role("admin")
  not has_role("compliance_officer")
}
