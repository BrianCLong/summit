import future.keywords
package release_gates

test_allow {
    allow with input as {"sbom_present": true, "signature_present": true}
}

test_deny_missing_sbom {
    deny["Missing SBOM"] with input as {"signature_present": true}
}

test_deny_critical_vulns {
    deny["Critical Vulnerabilities Detected"] with input as {"sbom_present": true, "signature_present": true, "vulnerabilities_critical": true}
}
