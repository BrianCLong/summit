package graphql

default allow = false

allow {
  input.user.tenant == input.args.tenantId
  input.user.scope[_] == "coherence:read"
}

allow {
  input.user.tenant == input.args.tenantId
  input.user.scope[_] == "coherence:read:self"
}

allow {
  input.user.tenant == input.args.tenantId
  input.user.scope[_] == "coherence:read"
  input.user.residency == input.args.residency // S3.2: Enforce data access by residency tag
}

allow_write {
  input.user.tenant == input.args.tenantId
  input.user.scope[_] == "coherence:write"
}

allow_write {
  input.user.tenant == input.args.tenantId
  input.user.scope[_] == "coherence:write:self"
}

allow_write {
  input.user.tenant == input.args.tenantId
  input.user.scope[_] == "coherence:write"
  input.user.residency == input.args.residency // S3.2: Enforce data access by residency tag
}
