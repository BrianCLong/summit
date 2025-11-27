package companyos.authz.customer

default decision := {
  "allow": false,
  "reason": "default_deny",
}

# Input:
# {
#   "subject": {...},
#   "resource": {"type": "customer", "tenant_id": "...", "region": "us"},
#   "action": "customer:read"
# }

decision := { "allow": true, "reason": "tenant_role_ok" } {
  input.action == "customer:read"
  input.resource.type == "customer"

  input.subject.tenant_id == input.resource.tenant_id

  not restricted_region_mismatch

  has_role("compliance_lead") or has_role("account_owner")
}

restricted_region_mismatch {
  input.resource.region == "eu"
  input.subject.attributes.region != "eu"
}

has_role(r) {
  some i
  input.subject.roles[i] == r
}
