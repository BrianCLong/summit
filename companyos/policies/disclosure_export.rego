package companyos.authz.disclosure_export

default decision := {
  "allow": false,
  "reason": "default_deny"
}

# Fully allowed
decision := {
  "allow": true,
  "reason": "tenant_region_role_and_mfa_ok"
} {
  input.action == "disclosure:export"
  input.resource.type == "disclosure_pack"

  same_tenant
  residency_match
  mfa_ok
  role_ok
}

# Same tenant/region/role, but MFA missing → explicit reason
decision := {
  "allow": false,
  "reason": "mfa_required"
} {
  input.action == "disclosure:export"
  input.resource.type == "disclosure_pack"

  same_tenant
  residency_match
  not mfa_ok
  role_ok
}

# Same tenant + MFA + role, but region mismatch → explicit reason
decision := {
  "allow": false,
  "reason": "residency_mismatch"
} {
  input.action == "disclosure:export"
  input.resource.type == "disclosure_pack"

  same_tenant
  not residency_match
  mfa_ok
  role_ok
}

same_tenant {
  input.subject.tenant_id == input.resource.tenant_id
}

residency_match {
  input.subject.attributes.region == input.resource.residency_region
}

mfa_ok {
  input.subject.attributes.mfa_verified == true
}

role_ok {
  has_role("compliance_lead") or has_role("security_lead")
}

has_role(r) {
  some i
  input.subject.roles[i] == r
}
