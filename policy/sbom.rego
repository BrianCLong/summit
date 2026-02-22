package summit.sbom

import future.keywords.contains
import future.keywords.if
import future.keywords.in

default acceptable := false

acceptable if {
  not has_critical_vulns
}

has_critical_vulns if {
  some i
  comp := input.components[i]
  some j
  vuln := comp.vulnerabilities[j]
  vuln.severity == "CRITICAL"
}

deny contains msg if {
  has_critical_vulns
  msg := "CRITICAL vulnerabilities present in SBOM components"
}
