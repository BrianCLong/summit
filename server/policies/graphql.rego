package graphql.authz
import future.keywords.if

# Default deny
default allow = false

# Reject if tenant mismatch
default deny_tenant_mismatch = false

deny_tenant_mismatch {
  input.context.tenantId
  input.jwt.claims.tenantId
  input.context.tenantId != input.jwt.claims.tenantId
}

# Allow all queries when tenant matches
allow {
  input.method == "POST"
  input.path == "/graphql"
  input.query.operationType == "query"
  not deny_tenant_mismatch
}

# Example: Allow specific mutation if user has 'admin' role and tenant matches
allow {
  input.method == "POST"
  input.path == "/graphql"
  input.query.operationType == "mutation"
  input.query.operationName == "createEntity"
  input.jwt.claims.roles[_] == "admin"
  not deny_tenant_mismatch
}

# Field-level authorization example: only admin can see 'secretField'
allow_field(field) {
  field == "secretField"
  input.jwt.claims.roles[_] == "admin"
} else {
  field != "secretField"
}
