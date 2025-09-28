package goldenpath

import rego.v1

# Input expects a JSON document assembled in CI containing sbom, sarif, and metadata nodes.
# The policy denies when license allowlist, secret scanning, or CVE budget are violated.

default allow := false
default deny := []

allowed_licenses := {"MIT", "APACHE-2.0", "BSD-3-CLAUSE", "BSD-2-CLAUSE", "ISC"}

license_violations[pkg] {
  sbom := input.sbom.packages
  pkg := sbom[_]
  license := upper(pkg.license)
  not allowed_licenses[license]
}

cve_budget := input.policy.cve_budget_limit or 0

cve_exceeds_budget if {
  findings := [finding | finding := input.vulns.findings[_]; finding.severity == "critical" or finding.severity == "high"]
  count(findings) > cve_budget
}

secret_findings_present if {
  findings := input.secrets.findings
  count(findings) > 0
  some finding
  finding := findings[_]
  finding.status != "false_positive"
}

allow if {
  count(license_violations) == 0
  not cve_exceeds_budget
  not secret_findings_present
}

deny[msg] := msg if {
  count(license_violations) > 0
  msg := sprintf("license violations detected: %v", [license_violations])
}

deny[msg] := msg if {
  cve_exceeds_budget
  msg := sprintf("cve budget exceeded: > %d", [cve_budget])
}

deny[msg] := msg if {
  secret_findings_present
  msg := "secret scan findings present"
}
