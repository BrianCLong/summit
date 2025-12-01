package intelgraph.rest

default allow = false

# Allow if tenant matches
allow {
  input.user.tenantId == input.context.tenantId
  # Basic method check
  allowed_method
}

allowed_method {
  input.resource.method == "get"
}

allowed_method {
  input.resource.method == "post"
  has_permission("write")
}

# Admin routes require admin role
deny {
  startswith(input.resource.path, "/admin")
  not has_role("admin")
}

# Helpers
has_permission(perm) {
  input.user.permissions[_] == perm
}

has_role(role) {
  input.user.role == role
}
