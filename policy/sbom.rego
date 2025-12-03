package summit.sbom

default acceptable = false

acceptable {
  not has_critical_vulns
}

has_critical_vulns {
  some i
  comp := input.components[i]
  some j
  vuln := comp.vulnerabilities[j]
  vuln.severity == "CRITICAL"
}

deny[msg] {
  has_critical_vulns
  msg := "CRITICAL vulnerabilities present in SBOM components"
}
