
package abac.authz

# Input model:
# input = {
#   "jwt": {"sub": "u1", "tenant": "t123", "roles": ["analyst"], "purpose": ["investigation"]},
#   "resource": {"tenant": "t123", "labels": ["pii"], "retention": "short-30d"},
#   "action": "read", # read|write|export
#   "context": {"country": "US"}
# }

default allow = false

tenant_isolated {
  input.jwt.tenant == input.resource.tenant
}

purpose_allowed {
  some p
  p := input.jwt.purpose[_]
  allowed := {"investigation", "threat-intel", "fraud-risk", "t&s", "benchmarking", "training", "demo"}
  allowed[p]
}

role_can_write {
  input.action == "write"
  some r
  r := input.jwt.roles[_]
  {"admin", "editor"}[r]
}

sensitive_read_ok {
  input.action == "read"
  not ("pii" in input.resource.labels)
} else {
  input.action == "read"
  ("pii" in input.resource.labels)
  # require elevated role for PII
  some r
  r := input.jwt.roles[_]
  {"admin", "privacy-officer"}[r]
}

allow {
  tenant_isolated
  purpose_allowed
  input.action == "read"
  sensitive_read_ok
}

allow {
  tenant_isolated
  purpose_allowed
  role_can_write
}
