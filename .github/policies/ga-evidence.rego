package ga_evidence

import future.keywords.if
import future.keywords.in

# GA Evidence Policy
# Ensures all required evidence artifacts are present and valid for a GA release.

default allow = false

# Allow if all required checks pass
allow if {
    valid_provenance
    valid_report
    no_critical_vulnerabilities
}

# Provenance Check
# Checks if provenance is present and has a valid SLSA predicate type
valid_provenance if {
    input.provenance
    input.provenance.predicateType == "https://slsa.dev/provenance/v0.2"
}

# Report Check
# Checks if report.json is present and has passing tests
valid_report if {
    input.report
    input.report.status == "passed"
    input.report.summary.passed > 0
    input.report.summary.failed == 0
}

# Vulnerability Check
# Checks if there are no critical vulnerabilities reported
no_critical_vulnerabilities if {
    not has_critical_vulns
}

has_critical_vulns if {
    some vuln in input.vulnerabilities
    vuln.severity == "CRITICAL"
}

# Helper to verify specific artifact existence
artifact_exists(artifact_name) if {
    input.artifacts[artifact_name]
}

# Deny rules for specific failures (for better error messages)
deny[msg] {
    not valid_provenance
    msg := "Missing or invalid provenance attestation"
}

deny[msg] {
    not valid_report
    msg := "Missing or failing test report"
}

deny[msg] {
    has_critical_vulns
    msg := "Critical vulnerabilities detected"
}
