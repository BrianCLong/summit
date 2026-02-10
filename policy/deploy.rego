package summit.deploy

import data.summit.shared

default allow := false

allow if {
  input.env == "prod"
  required_approvals_met
  sbom_signed
  not has_security_failures
}

required_approvals_met if {
  input.pr.approvals >= 2
}

sbom_signed if {
  input.artifact.sbom.signed == true
}

has_security_failures if {
  input.security.failures[_]
}

strict_deny contains msg if {
  input.env == "prod"
  not required_approvals_met
  msg := "insufficient approvals for production deploy"
}

strict_deny contains msg if {
  input.env == "prod"
  not sbom_signed
  msg := "SBOM is missing or unsigned"
}

strict_deny contains msg if {
  input.env == "prod"
  has_security_failures
  msg := "unresolved security failures present"
}
