package companyos.authz.customer

default allow := false

# Input shape:
# {
#   "subject": {...},
#   "resource": { "type": "customer", "tenant_id": "...", "region": "us" },
#   "action": "read"
# }

allow {
  input.action == "read"
  input.resource.type == "customer"

  same_tenant
  not restricted_region_mismatch

  has_role("compliance_lead") or has_role("account_owner")
}

same_tenant {
  input.subject.tenant_id == input.resource.tenant_id
}

restricted_region_mismatch {
  input.resource.region == "eu"
  input.subject.attributes.region != "eu"
}

has_role(r) {
  some i
  input.subject.roles[i] == r
}
