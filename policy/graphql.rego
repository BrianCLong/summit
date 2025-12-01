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
  input.user.permissions[_] == perm
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
