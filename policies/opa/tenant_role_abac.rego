package summit.authz
import rego.v1

# Attribute-based and role-aware access controls for Summit tenants.
# The policy enforces tenant boundaries, least privilege, purpose-based
# scoping, data minimisation, immutable auditing, and encryption guards
# for sensitive attributes.

default allow = false

action_roles := {
  "read": ["analyst", "manager", "admin", "legal", "global-admin"],
  "write": ["manager", "admin", "global-admin"],
  "delete": ["admin", "global-admin"],
  "tag": ["manager", "admin", "legal", "global-admin"]
}

classification_order := {
  "public": 0,
  "internal": 1,
  "confidential": 2,
  "restricted": 3,
  "secret": 4
}

sensitive_field_tags := {"pii", "phi", "credential", "financial"}

allow if {
  tenant_scoped
  role_allows_action
  purpose_compatible
  classification_allows
  mfa_enforced
  encryption_verified
  retention_enforced
  legal_hold_allows
  audit_present
}

tenant_scoped if {
  input.subject.roles[_] == "global-admin"
}

tenant_scoped if {
  input.subject.tenant == input.resource.tenant
}

role_allows_action if {
  required := action_roles[input.action]
  role := input.subject.roles[_]
  required[_] == role
}

classification_allows if {
  not input.resource.classification
}

classification_allows if {
  not input.subject.attributes.clearance
  not input.resource.classification
}

classification_allows if {
  subject_clearance := classification_order[input.subject.attributes.clearance]
  resource_level := classification_order[input.resource.classification]
  subject_clearance >= resource_level
}

purpose_compatible if {
  resource_tags := {tag |
    tag := input.resource.purpose_tags[_]
    tag != ""
  }
  subject_tags := {tag |
    tag := input.subject.attributes.purpose_tags[_]
    tag != ""
  }
  count(resource_tags) > 0
  some tag
  resource_tags[tag]
  subject_tags[tag]
}

purpose_compatible if {
  resource_tags := {tag |
    tag := input.resource.purpose_tags[_]
    tag != ""
  }
  count(resource_tags) == 0
  input.subject.roles[_] == "global-admin"
}

purpose_compatible if {
  not input.resource.purpose_tags
  input.subject.roles[_] == "global-admin"
}

purpose_compatible if {
  input.resource.legal_hold
  subject_has_role("legal")
}

purpose_compatible if {
  input.resource.legal_hold
  subject_has_role("global-admin")
}

subject_has_role(role) if {
  input.subject.roles[_] == role
}

mfa_enforced if {
  not input.environment.require_mfa
}

mfa_enforced if {
  input.environment.require_mfa
  input.subject.attributes.mfa_enrolled
  input.environment.mfa_satisfied
}

encryption_verified if {
  not input.resource.fields
}

encryption_verified if {
  fields := input.resource.fields
  not fields_unprotected(fields)
}

fields_unprotected(fields) if {
  field := fields[_]
  not field_protected(field)
}

field_protected(field) if {
  not field.sensitive
}

field_protected(field) if {
  field.sensitive
  field.tags[_] == tag
  sensitive_field_tags[tag]
  field.encrypted
  field.algorithm != ""
  field.kms_key_id != ""
}

retention_enforced if {
  not input.resource.pii
}

retention_enforced if {
  input.resource.pii
  input.resource.legal_hold
}

retention_enforced if {
  input.resource.pii
  input.resource.retention_days <= 30
}

legal_hold_allows if {
  not input.resource.legal_hold
}

legal_hold_allows if {
  input.resource.legal_hold
  some role
  input.subject.roles[_] == role
  {"legal", "global-admin"}[role]
}

audit_present if {
  audit := input.environment.audit
  audit.event_id != ""
  audit.immutable
}
