package policy.cve_budget

import future.keywords.if

severity_levels := ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

violations[msg] {
  service := input.services[_]
  severity := severity_levels[_]
  budget := service.budgets[severity]
  count := service.effective_counts[severity]
  budget
  count > budget
  msg := sprintf("service %s exceeds %s budget (%d > %d)", [service.name, severity, count, budget])
}

violations[msg] {
  service := input.services[_]
  failure := service.attestation_failures[_]
  msg := sprintf("service %s attestation failure: %s", [service.name, failure])
}

violations[msg] {
  missing := input.missing_services[_]
  msg := sprintf("service %s missing vulnerability report", [missing])
}

violations[msg] {
  service := input.services[_]
  some artifact
  artifact := service.artifacts[artifact]
  not artifact.signed
  msg := sprintf("service %s has unsigned artifact %s", [service.name, artifact.image])
}

violations[msg] {
  service := input.services[_]
  some artifact
  artifact := service.artifacts[artifact]
  not artifact.attestations_verified
  msg := sprintf("service %s has unverified attestation for %s", [service.name, artifact.image])
}

violations[msg] {
  service := input.services[_]
  some artifact
  artifact := service.artifacts[artifact]
  not artifact.sbom_present
  msg := sprintf("service %s missing SBOM reference for %s", [service.name, artifact.image])
}

allow {
  count(violations) == 0
}
