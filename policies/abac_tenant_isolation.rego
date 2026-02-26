package abac_tenant_isolation

import future.keywords

deny[msg] {
  input.user.tenant_id != input.resource.tenant_id
  msg := "Tenant isolation violation"
}
