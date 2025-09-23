package graphql.authz

# Default deny
default allow = false

# Allow all queries for now (placeholder)
allow {
  input.method == "POST"
  input.path == "/graphql"
  input.query.operationType == "query"
}

# Example: Allow specific mutation if user has 'admin' role
allow {
  input.method == "POST"
  input.path == "/graphql"
  input.query.operationType == "mutation"
  input.query.operationName == "createEntity"
  input.jwt.claims.roles[_] == "admin"
}

# Field-level authorization example: only admin can see 'secretField'
allow_field(field) {
  field == "secretField"
  input.jwt.claims.roles[_] == "admin"
} else {
  field != "secretField"
}