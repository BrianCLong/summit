import future.keywords.in
package policy.cve_budget

import future.keywords.if
import future.keywords.contains

severity_levels := ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

violations contains msg if {
  service := input.services[_]
  severity := severity_levels[_]
  budget := service.budgets[severity]
  count := service.effective_counts[severity]
  budget
  count > budget
  msg := sprintf("service %s exceeds %s budget (%d > %d)", [service.name, severity, count, budget])
}

violations contains msg if {
  service := input.services[_]
  failure := service.attestation_failures[_]
  msg := sprintf("service %s attestation failure: %s", [service.name, failure])
}

violations contains msg if {
  missing := input.missing_services[_]
  msg := sprintf("service %s missing vulnerability report", [missing])
}

violations contains msg if {
  service := input.services[_]
  some key
  artifact := service.artifacts[key]
  not artifact.signed
  msg := sprintf("service %s has unsigned artifact %s", [service.name, artifact.image])
}

violations contains msg if {
  service := input.services[_]
  some key
  artifact := service.artifacts[key]
  not artifact.attestations_verified
  msg := sprintf("service %s has unverified attestation for %s", [service.name, artifact.image])
}

violations contains msg if {
  service := input.services[_]
  some key
  artifact := service.artifacts[key]
  not artifact.sbom_present
  msg := sprintf("service %s missing SBOM reference for %s", [service.name, artifact.image])
}

allow if {
  count(violations) == 0
}
