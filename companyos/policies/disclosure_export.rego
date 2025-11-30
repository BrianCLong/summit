package companyos.authz.disclosure_export

default decision := {
  "allow": false,
  "reason": "default_deny"
}

# Input:
# {
#   "subject": {...},
#   "resource": {
#     "type": "disclosure_pack",
#     "tenant_id": "...",
#     "residency_region": "eu" | "us"
#   },
#   "action": "disclosure:export"
# }

decision := {
  "allow": true,
  "reason": "tenant_region_role_and_mfa_ok"
} {
  input.action == "disclosure:export"
  input.resource.type == "disclosure_pack"

  # same tenant
  input.subject.tenant_id == input.resource.tenant_id

  # residency match: no cross-region export
  input.subject.attributes.region == input.resource.residency_region

  # step-up auth: MFA verified
  input.subject.attributes.mfa_verified == true

  # require appropriate role
  has_role("compliance_lead") or has_role("security_lead")
}

has_role(r) {
  some i
  input.subject.roles[i] == r
}
