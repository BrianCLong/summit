package summit.deploy

import data.summit.shared

default allow = false

allow {
  input.env == "prod"
  required_approvals_met
  sbom_signed
  not has_security_failures
}

required_approvals_met {
  input.pr.approvals >= 2
}

sbom_signed {
  input.artifact.sbom.signed == true
}

has_security_failures {
  input.security.failures[_]
}

strict_deny[msg] {
  input.env == "prod"
  not required_approvals_met
  msg := "insufficient approvals for production deploy"
}

strict_deny[msg] {
  input.env == "prod"
  not sbom_signed
  msg := "SBOM is missing or unsigned"
}

strict_deny[msg] {
  input.env == "prod"
  has_security_failures
  msg := "unresolved security failures present"
}
