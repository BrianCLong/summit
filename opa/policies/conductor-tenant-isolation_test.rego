
package opa.policies

test_tenant_isolation_violation_denied {
  input := {"tenant": "A", "resource": {"tenant": "B"}}
  deny := data.opa.policies.conductor_tenant_isolation.deny with input as input
  count(deny) > 0
}
