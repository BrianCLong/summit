# (same as in sprint doc)
package abac.authz
import future.keywords.if
import future.keywords.in
import future.keywords.contains

default allow = false

# Rule to check if tenant is isolated
tenant_isolated if {
  input.jwt.tenant == input.resource.tenant
}

# Simplified purpose allowed rules to avoid variable conflicts
purpose_investigation if {
  input.jwt.purpose[_] == "investigation" 
}

purpose_threat_intel if {
  input.jwt.purpose[_] == "threat-intel"
}

purpose_fraud_risk if {
  input.jwt.purpose[_] == "fraud-risk"
}

purpose_t_and_s if {
  input.jwt.purpose[_] == "t&s"
}

purpose_benchmarking if {
  input.jwt.purpose[_] == "benchmarking"
}

purpose_training if {
  input.jwt.purpose[_] == "training"
}

purpose_demo if {
  input.jwt.purpose[_] == "demo"
}

purpose_allowed if { purpose_investigation }
purpose_allowed if { purpose_threat_intel }
purpose_allowed if { purpose_fraud_risk }
purpose_allowed if { purpose_t_and_s }
purpose_allowed if { purpose_benchmarking }
purpose_allowed if { purpose_training }
purpose_allowed if { purpose_demo }

# Role checks
role_admin_write if {
  input.action == "write"
  input.jwt.roles[_] == "admin"
}

role_editor_write if {
  input.action == "write"
  input.jwt.roles[_] == "editor"
}

role_can_write if { role_admin_write }
role_can_write if { role_editor_write }

# Sensitive data read checks
sensitive_read_basic_ok if {
  input.action == "read"
  not ("pii" in input.resource.labels)
}

sensitive_read_privileged_ok if {
  input.action == "read"
  ("pii" in input.resource.labels)
  input.jwt.roles[_] == "admin"
}

sensitive_read_officer_ok if {
  input.action == "read"
  ("pii" in input.resource.labels)
  input.jwt.roles[_] == "privacy-officer"
}

sensitive_read_ok if { sensitive_read_basic_ok }
sensitive_read_ok if { sensitive_read_privileged_ok }
sensitive_read_ok if { sensitive_read_officer_ok }

# Main authorization rules
allow if {
  tenant_isolated
  purpose_allowed
  input.action == "read"
  sensitive_read_ok
}

allow if {
  tenant_isolated
  purpose_allowed
  role_can_write
}