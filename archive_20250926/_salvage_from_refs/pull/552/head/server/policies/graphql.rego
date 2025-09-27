package graphql.authz

# Default deny
default allow = false

# Reject if tenant mismatch
default deny_tenant_mismatch = false

deny_tenant_mismatch {
  input.context.tenantId
  input.jwt.claims.tenantId
  input.context.tenantId != input.jwt.claims.tenantId
}

# deny writes from quarantined media
default deny_quarantined = false

deny_quarantined {
  input.context.quarantined
}

# Allow all queries when tenant matches
allow {
  input.method == "POST"
  input.path == "/graphql"
  input.query.operationType == "query"
  not deny_tenant_mismatch
  not deny_quarantined
}

# Example: Allow specific mutation if user has 'admin' role and tenant matches
allow {
  input.method == "POST"
  input.path == "/graphql"
  input.query.operationType == "mutation"
  input.query.operationName == "createEntity"
  input.jwt.claims.roles[_] == "admin"
  not deny_tenant_mismatch
  not deny_quarantined
}

# Only Reviewer role may call reviewMedia
allow {
  input.method == "POST"
  input.path == "/graphql"
  input.query.operationType == "mutation"
  input.query.operationName == "reviewMedia"
  input.jwt.claims.roles[_] == "Reviewer"
  not deny_tenant_mismatch
  not deny_quarantined
}

# Field-level authorization example: only admin can see 'secretField'
allow_field(field) {
  field == "secretField"
  input.jwt.claims.roles[_] == "admin"
} else {
  field != "secretField"
}
