# Baseline ABAC Policy
# Based on sprint doc requirements
package abac.authz

import future.keywords.if
import future.keywords.in

default allow = false

# Rule to check if tenant is isolated
tenant_isolated if {
  input.subject.tenant == input.resource.tenant
}

# Purpose check (mapped from subject attributes or context)
purpose_investigation if { input.subject.purpose[_] == "investigation" }
purpose_threat_intel if { input.subject.purpose[_] == "threat-intel" }
purpose_fraud_risk if { input.subject.purpose[_] == "fraud-risk" }
purpose_t_and_s if { input.subject.purpose[_] == "t&s" }
purpose_benchmarking if { input.subject.purpose[_] == "benchmarking" }
purpose_training if { input.subject.purpose[_] == "training" }
purpose_demo if { input.subject.purpose[_] == "demo" }

purpose_allowed if { purpose_investigation }
purpose_allowed if { purpose_threat_intel }
purpose_allowed if { purpose_fraud_risk }
purpose_allowed if { purpose_t_and_s }
purpose_allowed if { purpose_benchmarking }
purpose_allowed if { purpose_training }
purpose_allowed if { purpose_demo }

# Action mapping
is_read if { input.action == "read" }
is_read if { startswith(input.action, "get:") }
is_read if { startswith(input.action, "head:") }

is_write if { input.action == "write" }
is_write if { startswith(input.action, "post:") }
is_write if { startswith(input.action, "put:") }
is_write if { startswith(input.action, "delete:") }
is_write if { startswith(input.action, "patch:") }

# Role checks
role_admin_write if {
  is_write
  input.subject.roles[_] == "admin"
}

role_editor_write if {
  is_write
  input.subject.roles[_] == "editor"
}

role_can_write if { role_admin_write }
role_can_write if { role_editor_write }

# Sensitive data read checks
sensitive_read_basic_ok if {
  is_read
  input.resource.classification != "pii"
  input.resource.classification != "restricted"
}

sensitive_read_privileged_ok if {
  is_read
  input.resource.classification == "pii"
  input.subject.roles[_] == "admin"
}

sensitive_read_officer_ok if {
  is_read
  input.resource.classification == "pii"
  input.subject.roles[_] == "privacy-officer"
}

sensitive_read_ok if { sensitive_read_basic_ok }
sensitive_read_ok if { sensitive_read_privileged_ok }
sensitive_read_ok if { sensitive_read_officer_ok }

# Main authorization rules
allow if {
  tenant_isolated
  purpose_allowed
  is_read
  sensitive_read_ok
}

allow if {
  tenant_isolated
  purpose_allowed
  role_can_write
}

# Decision object for middleware compatibility
decision := {
  "allow": true,
  "deny": [],
  "obligations": {},
  "metadata": {}
} if {
  allow
}

decision := {
  "allow": false,
  "deny": ["policy_denied"],
  "obligations": {},
  "metadata": {}
} if {
  not allow
}
