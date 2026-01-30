# (same as in sprint doc)
package abac.authz
default allow = false
tenant_isolated if { input.jwt.tenant == input.resource.tenant }
purpose_allowed if {
  some p
  p := input.jwt.purpose[_]
  allowed := {"investigation", "threat-intel", "fraud-risk", "t&s", "benchmarking", "training", "demo"}
  allowed[p]
}
role_can_write if {
  input.action == "write"
  some r
  r := input.jwt.roles[_]
  {"admin", "editor"}[r]
}
sensitive_read_ok if {
  input.action == "read"
  not ("pii" in input.resource.labels)
} else {
  input.action == "read"
  ("pii" in input.resource.labels)
  some r
  r := input.jwt.roles[_]
  {"admin", "privacy-officer"}[r]
}
allow { tenant_isolated; purpose_allowed; input.action == "read"; sensitive_read_ok }
allow { tenant_isolated; purpose_allowed; role_can_write }
