package intelgraph.rest
import future.keywords.if

default allow := false

# Allow if tenant matches
allow if {
  input.user.tenantId == input.context.tenantId
  # Basic method check
  allowed_method
}

allowed_method if {
  input.resource.method == "get"
}

allowed_method if {
  input.resource.method == "post"
  has_permission("write")
}

# Admin routes require admin role
deny if {
  startswith(input.resource.path, "/admin")
  not has_role("admin")
}

# Helpers
has_permission(perm) if {
  input.user.permissions[_] == perm
}

has_role(role) if {
  input.user.role == role
}
