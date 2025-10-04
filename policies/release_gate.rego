package release_gate

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# Release gate rules for October 2025
allow if {
    required_checks_pass
    required_artifacts_present
    security_gates_pass
    no_critical_vulnerabilities
}

# Required CI checks must be green
required_checks_pass if {
    input.ci_status == "success"
    input.tests_passed == true
}

# Required artifacts must be present
required_artifacts_present if {
    input.sbom_present == true
    input.provenance_present == true
    input.grafana_json_committed == true
}

# Security gates must pass
security_gates_pass if {
    input.codeql_passed == true
    input.trivy_passed == true
    input.gitleaks_passed == true
}

# No critical vulnerabilities allowed
no_critical_vulnerabilities if {
    input.critical_vulns_count == 0
}

# Violations for reporting
violations contains msg if {
    not required_checks_pass
    msg := "CI checks must pass (ci_status=success, tests_passed=true)"
}

violations contains msg if {
    not input.sbom_present
    msg := "SBOM (sbom.json) must be present in release assets"
}

violations contains msg if {
    not input.provenance_present
    msg := "Provenance attestation must be present in release assets"
}

violations contains msg if {
    not input.grafana_json_committed
    msg := "Grafana dashboard JSON must be committed to /observability/grafana/"
}

violations contains msg if {
    not input.codeql_passed
    msg := "CodeQL scan must pass with no high/critical findings"
}

violations contains msg if {
    not input.trivy_passed
    msg := "Trivy container scan must pass with no critical findings"
}

violations contains msg if {
    not input.gitleaks_passed
    msg := "Gitleaks secret scan must pass with no leaks"
}

violations contains msg if {
    input.critical_vulns_count > 0
    msg := sprintf("Critical vulnerabilities found: %d (must be 0)", [input.critical_vulns_count])
}

# Appeal path
appeal_instructions := "To request a waiver, create an issue with label 'security-waiver' and tag @security-team"
