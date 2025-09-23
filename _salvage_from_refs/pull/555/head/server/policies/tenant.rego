package intelgraph.tenant

default allow = false

allow {
  input.auth.tenantId == input.resource.tenantId
  not input.action in {"adminOnly"}
  input.auth.role in {"TenantAdmin","Analyst","Reviewer","Auditor"}
}

deny_reason[msg] {
  not allow
  msg := "tenant_policy_denied"
}
