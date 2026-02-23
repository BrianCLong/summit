# (same as in sprint doc)
package abac.authz

default allow = false

# Rule to check if tenant is isolated
tenant_isolated {
  input.jwt.tenant == input.resource.tenant
}

# Simplified purpose allowed rules to avoid variable conflicts
purpose_investigation {
  input.jwt.purpose[_] == "investigation" 
}

purpose_threat_intel {
  input.jwt.purpose[_] == "threat-intel"
}

purpose_fraud_risk {
  input.jwt.purpose[_] == "fraud-risk"
}

purpose_t_and_s {
  input.jwt.purpose[_] == "t&s"
}

purpose_benchmarking {
  input.jwt.purpose[_] == "benchmarking"
}

purpose_training {
  input.jwt.purpose[_] == "training"
}

purpose_demo {
  input.jwt.purpose[_] == "demo"
}

purpose_allowed { purpose_investigation }
purpose_allowed { purpose_threat_intel }
purpose_allowed { purpose_fraud_risk }
purpose_allowed { purpose_t_and_s }
purpose_allowed { purpose_benchmarking }
purpose_allowed { purpose_training }
purpose_allowed { purpose_demo }

# Role checks
role_admin_write {
  input.action == "write"
  input.jwt.roles[_] == "admin"
}

role_editor_write {
  input.action == "write"
  input.jwt.roles[_] == "editor"
}

role_can_write { role_admin_write }
role_can_write { role_editor_write }

has_pii {
  input.resource.labels[_] == "pii"
}

# Sensitive data read checks
sensitive_read_basic_ok {
  input.action == "read"
  not has_pii
}

sensitive_read_privileged_ok {
  input.action == "read"
  has_pii
  input.jwt.roles[_] == "admin"
}

sensitive_read_officer_ok {
  input.action == "read"
  has_pii
  input.jwt.roles[_] == "privacy-officer"
}

sensitive_read_ok { sensitive_read_basic_ok }
sensitive_read_ok { sensitive_read_privileged_ok }
sensitive_read_ok { sensitive_read_officer_ok }

# Main authorization rules
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
