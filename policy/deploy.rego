package summit.deploy

import future.keywords.if
import future.keywords.contains

import data.summit.shared
import future.keywords

default allow := false

allow if {
  input.env == "prod"
  required_approvals_met
  sbom_signed
  evidence_verified
  not has_security_failures
}

required_approvals_met if {
  input.pr.approvals >= 2
}

sbom_signed if {
  input.artifact.sbom.signed == true
}

evidence_verified if {
  input.evidence.bundle_id
  input.evidence.status == "verified"
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
  not evidence_verified
  msg := "compliance evidence missing or unverified"
}

strict_deny contains msg if {
  input.env == "prod"
  has_security_failures
  msg := "unresolved security failures present"
}
